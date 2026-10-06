package main

// Analisador de espaço em disco (estilo SpaceSniffer): varre uma pasta ou unidade em paralelo, guarda uma árvore
// compacta em memória (todas as pastas + os maiores arquivos de cada pasta) e serve recortes dela para o mapa
// de blocos da interface. Somente leitura: nada é alterado nem apagado.

import (
	"container/heap"
	"context"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// categorias de arquivo (cor no mapa)
const (
	catOutros = iota
	catVideo
	catAudio
	catImagem
	catDoc
	catZip
	catExe
	catCodigo
	nCat
)

var catNames = [nCat]string{"Outros", "Vídeos", "Áudio", "Imagens", "Documentos", "Compactados e imagens de disco", "Programas e sistema", "Código e dados"}

var extCat = func() map[string]uint8 {
	m := map[string]uint8{}
	add := func(c uint8, exts string) {
		for _, e := range strings.Fields(exts) {
			m[e] = c
		}
	}
	add(catVideo, "mp4 mkv avi mov wmv flv webm m4v mpg mpeg ts m2ts vob 3gp")
	add(catAudio, "mp3 wav flac aac ogg m4a wma opus aiff mid midi")
	add(catImagem, "jpg jpeg png gif bmp tif tiff webp heic heif raw cr2 nef arw dng psd ai svg ico xcf")
	add(catDoc, "pdf doc docx xls xlsx ppt pptx odt ods odp txt rtf csv md epub mobi pst ost eml msg one")
	add(catZip, "zip rar 7z gz tgz bz2 xz tar iso img vhd vhdx vmdk vdi wim esd cab dmg qcow2 ova")
	add(catExe, "exe dll sys msi msix appx cat mui drv ocx cpl scr efi lnk bin dat etl cab_ msp mum manifest pf winmd node so dylib")
	add(catCodigo, "js ts jsx tsx py go rs c cpp h hpp cs java kt php rb sh ps1 bat cmd json xml yaml yml toml ini cfg log sql db sqlite mdb accdb html htm css map lock mjs")
	return m
}()

func fileCat(name string) uint8 {
	i := strings.LastIndexByte(name, '.')
	if i < 0 || i == len(name)-1 {
		return catOutros
	}
	return extCat[strings.ToLower(name[i+1:])]
}

type fentry struct {
	name  string
	size  int64
	mtime int64
	cat   uint8
}

type dnode struct {
	name       string
	dirs       []*dnode
	files      []fentry // somente os maiores arquivos desta pasta
	otherBytes int64    // arquivos desta pasta que não foram guardados individualmente
	otherCount int64
	size       int64 // total do ramo (pasta + subpastas)
	count      int64 // arquivos no ramo
	cat        [nCat]int64
	mtime      int64
	denied     bool
}

const keepFilesPerDir = 400

type scanState struct {
	id      string
	root    string
	started time.Time
	ended   atomic.Int64 // unix nano; 0 enquanto roda
	cancel  context.CancelFunc
	state   atomic.Value // "scanning" | "done" | "cancelled" | "error"
	files   atomic.Int64
	dirs    atomic.Int64
	bytes   atomic.Int64
	denied  atomic.Int64
	current atomic.Value // string
	tree    *dnode
	errMsg  string
}

type scanManager struct {
	mu    sync.Mutex
	scans map[string]*scanState
	order []string
}

var scans = &scanManager{scans: map[string]*scanState{}}

func (m *scanManager) add(s *scanState) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.scans[s.id] = s
	m.order = append(m.order, s.id)
	for len(m.order) > 3 { // guarda só as 3 últimas (a memória das árvores é liberada)
		old := m.scans[m.order[0]]
		if old != nil && old.cancel != nil && old.state.Load() == "scanning" {
			old.cancel()
		}
		delete(m.scans, m.order[0])
		m.order = m.order[1:]
	}
}

func (m *scanManager) get(id string) *scanState {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.scans[id]
}

// ---------- varredura ----------

func (s *scanState) run(ctx context.Context, demo bool) {
	defer func() {
		s.ended.Store(time.Now().UnixNano())
		if s.state.Load() == "scanning" {
			if ctx.Err() != nil {
				s.state.Store("cancelled")
			} else {
				s.state.Store("done")
			}
		}
	}()
	if demo {
		s.tree = demoScanTree()
		finalize(s.tree)
		s.files.Store(s.tree.count)
		s.bytes.Store(s.tree.size)
		s.dirs.Store(countDirs(s.tree))
		return
	}
	root := &dnode{name: s.root}
	s.tree = root
	sem := make(chan struct{}, 24)
	var wg sync.WaitGroup
	var scan func(n *dnode, path string)
	scan = func(n *dnode, path string) {
		defer wg.Done()
		if ctx.Err() != nil {
			return
		}
		s.dirs.Add(1)
		s.current.Store(path)
		sem <- struct{}{}
		ents, err := os.ReadDir(path)
		<-sem
		if err != nil {
			n.denied = true
			s.denied.Add(1)
		}
		var files []fentry
		for _, e := range ents {
			if ctx.Err() != nil {
				return
			}
			name := e.Name()
			if e.IsDir() {
				if e.Type()&os.ModeSymlink != 0 {
					continue
				}
				info, ierr := e.Info()
				if ierr == nil && isReparseDir(info) {
					continue // junctions e pontos de montagem: evita laços e contar duas vezes
				}
				child := &dnode{name: name}
				if ierr == nil {
					child.mtime = info.ModTime().Unix()
				}
				n.dirs = append(n.dirs, child)
				wg.Add(1)
				go scan(child, filepath.Join(path, name))
				continue
			}
			if e.Type()&os.ModeSymlink != 0 {
				continue
			}
			info, ierr := e.Info()
			if ierr != nil {
				continue
			}
			if e.Type()&os.ModeIrregular != 0 && info.Size() == 0 {
				continue // junction/ponto de montagem que o Go reporta como "arquivo"
			}
			sz := info.Size()
			if isOffline(info) {
				sz = 0 // arquivo só na nuvem (OneDrive etc.): não ocupa espaço no disco
			}
			files = append(files, fentry{name: name, size: sz, mtime: info.ModTime().Unix(), cat: fileCat(name)})
			s.files.Add(1)
			s.bytes.Add(sz)
		}
		if len(files) > keepFilesPerDir {
			sort.Slice(files, func(i, j int) bool { return files[i].size > files[j].size })
			for _, f := range files[keepFilesPerDir:] {
				n.otherBytes += f.size
				n.otherCount++
				n.cat[f.cat] += f.size
			}
			files = files[:keepFilesPerDir]
		}
		n.files = files
	}
	wg.Add(1)
	go scan(root, s.root)
	wg.Wait()
	if ctx.Err() == nil {
		finalize(root)
	}
}

// finalize soma tamanhos e contagens de baixo para cima e ordena os filhos.
func finalize(n *dnode) {
	var sz, cnt int64 = n.otherBytes, n.otherCount
	cats := n.cat // já contém os arquivos não guardados individualmente
	for _, f := range n.files {
		sz += f.size
		cnt++
		cats[f.cat] += f.size
	}
	for _, d := range n.dirs {
		finalize(d)
		sz += d.size
		cnt += d.count
		for i := range cats {
			cats[i] += d.cat[i]
		}
	}
	sort.Slice(n.dirs, func(i, j int) bool { return n.dirs[i].size > n.dirs[j].size })
	sort.Slice(n.files, func(i, j int) bool { return n.files[i].size > n.files[j].size })
	n.size, n.count, n.cat = sz, cnt, cats
}

func countDirs(n *dnode) int64 {
	c := int64(1)
	for _, d := range n.dirs {
		c += countDirs(d)
	}
	return c
}

// ---------- recorte da árvore para a interface ----------

type tnode struct {
	N string  `json:"n"`
	S int64   `json:"s"`
	F int64   `json:"f"`
	D bool    `json:"d,omitempty"`
	C uint8   `json:"c,omitempty"`
	M int64   `json:"m,omitempty"`
	X bool    `json:"x,omitempty"` // pasta sem permissão de leitura
	K []tnode `json:"k,omitempty"`
	O *tother `json:"o,omitempty"` // itens menores agrupados
}

type tother struct {
	S int64 `json:"s"`
	F int64 `json:"f"`
}

func (n *dnode) find(parts []string) *dnode {
	cur := n
	for _, p := range parts {
		var next *dnode
		for _, d := range cur.dirs {
			if strings.EqualFold(d.name, p) {
				next = d
				break
			}
		}
		if next == nil {
			return nil
		}
		cur = next
	}
	return cur
}

// emit gera o recorte de n com até depth níveis; itens menores que minSize viram "o".
func emit(n *dnode, depth int, minSize int64, count *int) tnode {
	t := tnode{N: n.name, S: n.size, F: n.count, D: true, M: n.mtime, X: n.denied}
	*count++
	if depth <= 0 {
		return t
	}
	o := tother{S: n.otherBytes, F: n.otherCount}
	di, fi := 0, 0
	for di < len(n.dirs) || fi < len(n.files) {
		useDir := fi >= len(n.files) || (di < len(n.dirs) && n.dirs[di].size >= n.files[fi].size)
		if useDir {
			d := n.dirs[di]
			di++
			if d.size < minSize {
				o.S += d.size
				o.F += d.count
				continue
			}
			t.K = append(t.K, emit(d, depth-1, minSize, count))
		} else {
			f := n.files[fi]
			fi++
			if f.size < minSize {
				o.S += f.size
				o.F++
				continue
			}
			t.K = append(t.K, tnode{N: f.name, S: f.size, F: 1, C: f.cat, M: f.mtime})
			*count++
		}
	}
	if o.S > 0 || o.F > 0 {
		t.O = &o
	}
	return t
}

type topFile struct {
	P []string `json:"p"`
	S int64    `json:"s"`
	C uint8    `json:"c"`
	M int64    `json:"m"`
}

type topHeap []topFile

func (h topHeap) Len() int            { return len(h) }
func (h topHeap) Less(i, j int) bool  { return h[i].S < h[j].S }
func (h topHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *topHeap) Push(x interface{}) { *h = append(*h, x.(topFile)) }
func (h *topHeap) Pop() interface{} {
	old := *h
	x := old[len(old)-1]
	*h = old[:len(old)-1]
	return x
}

func collectTop(n *dnode, path []string, h *topHeap, limit int) {
	for _, f := range n.files {
		if len(*h) >= limit && f.size <= (*h)[0].S {
			break // arquivos de cada pasta já estão em ordem decrescente
		}
		p := append(append([]string{}, path...), f.name)
		heap.Push(h, topFile{P: p, S: f.size, C: f.cat, M: f.mtime})
		if len(*h) > limit {
			heap.Pop(h)
		}
	}
	for _, d := range n.dirs {
		if len(*h) >= limit && d.size <= (*h)[0].S {
			continue // nada nessa pasta supera o menor da lista
		}
		collectTop(d, append(path, d.name), h, limit)
	}
}

// ---------- HTTP ----------

func normalizeRoot(p string) string {
	p = strings.TrimSpace(strings.Trim(p, `"`))
	if len(p) == 2 && p[1] == ':' {
		p += `\`
	}
	if len(p) == 3 && p[1] == ':' && (p[2] == '\\' || p[2] == '/') {
		return p[:2] + `\`
	}
	return filepath.Clean(p)
}

func (a *App) handleScanStart(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path string `json:"path"`
	}
	if err := readJSON(r, &req); err != nil || strings.TrimSpace(req.Path) == "" {
		writeJSON(w, 400, map[string]any{"error": "informe uma pasta ou unidade (por exemplo C:\\)"})
		return
	}
	root := normalizeRoot(req.Path)
	if a.Demo {
		root = `C:\`
	} else if st, err := os.Stat(root); err != nil || !st.IsDir() {
		writeJSON(w, 400, map[string]any{"error": "pasta não encontrada ou inacessível: " + root})
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	s := &scanState{id: newToken()[:12], root: root, started: time.Now(), cancel: cancel}
	s.state.Store("scanning")
	s.current.Store(root)
	scans.add(s)
	go s.run(ctx, a.Demo)
	writeJSON(w, 200, map[string]any{"id": s.id, "root": root})
}

func (s *scanState) status() map[string]any {
	end := time.Now()
	if e := s.ended.Load(); e != 0 {
		end = time.Unix(0, e)
	}
	cur, _ := s.current.Load().(string)
	st, _ := s.state.Load().(string)
	m := map[string]any{"state": st, "root": s.root, "files": s.files.Load(), "dirs": s.dirs.Load(), "bytes": s.bytes.Load(), "denied": s.denied.Load(),
		"current": cur, "seconds": end.Sub(s.started).Seconds()}
	if st == "done" && s.tree != nil {
		m["total"] = s.tree.size
		m["totalFiles"] = s.tree.count
	}
	return m
}

func (a *App) scanFromReq(w http.ResponseWriter, r *http.Request) *scanState {
	s := scans.get(r.PathValue("id"))
	if s == nil {
		writeJSON(w, 404, map[string]any{"error": "análise não encontrada (talvez o programa tenha sido reiniciado); analise de novo"})
	}
	return s
}

func (a *App) handleScanStatus(w http.ResponseWriter, r *http.Request) {
	if s := a.scanFromReq(w, r); s != nil {
		writeJSON(w, 200, s.status())
	}
}

func (a *App) handleScanCancel(w http.ResponseWriter, r *http.Request) {
	if s := a.scanFromReq(w, r); s != nil {
		s.cancel()
		writeJSON(w, 200, map[string]any{"ok": true})
	}
}

func (a *App) handleScanTree(w http.ResponseWriter, r *http.Request) {
	s := a.scanFromReq(w, r)
	if s == nil {
		return
	}
	if st, _ := s.state.Load().(string); st != "done" || s.tree == nil {
		writeJSON(w, 409, map[string]any{"error": "a análise ainda não terminou"})
		return
	}
	q := r.URL.Query()
	parts := q["p"]
	n := s.tree.find(parts)
	if n == nil {
		writeJSON(w, 404, map[string]any{"error": "pasta não está na análise"})
		return
	}
	depth, _ := strconv.Atoi(q.Get("depth"))
	if depth < 1 || depth > 5 {
		depth = 3
	}
	// ajusta o limite de tamanho até o recorte caber em ~2000 blocos
	frac := 0.0004
	var out tnode
	for i := 0; i < 12; i++ {
		cnt := 0
		out = emit(n, depth, int64(float64(n.size)*frac), &cnt)
		if cnt <= 2000 {
			break
		}
		frac *= 1.7
	}
	h := &topHeap{}
	collectTop(n, append([]string{}, parts...), h, 15)
	top := make([]topFile, h.Len())
	for i := len(top) - 1; i >= 0; i-- {
		top[i] = heap.Pop(h).(topFile)
	}
	cats := make([]map[string]any, 0, nCat)
	for i := 0; i < nCat; i++ {
		if n.cat[i] > 0 {
			cats = append(cats, map[string]any{"c": i, "name": catNames[i], "s": n.cat[i]})
		}
	}
	writeJSON(w, 200, map[string]any{"node": out, "top": top, "cats": cats, "root": s.root})
}

// handleScanReveal abre o item no Explorer. Só aceita caminhos que existem na árvore analisada (sem "..").
func (a *App) handleScanReveal(w http.ResponseWriter, r *http.Request) {
	s := a.scanFromReq(w, r)
	if s == nil || s.tree == nil {
		return
	}
	var req struct {
		Parts []string `json:"parts"`
	}
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, 400, map[string]any{"error": "requisição inválida"})
		return
	}
	isDir := true
	n := s.tree.find(req.Parts)
	if n == nil && len(req.Parts) > 0 { // pode ser um arquivo dentro da pasta anterior
		if parent := s.tree.find(req.Parts[:len(req.Parts)-1]); parent != nil {
			last := req.Parts[len(req.Parts)-1]
			for _, f := range parent.files {
				if strings.EqualFold(f.name, last) {
					isDir = false
					n = parent
					break
				}
			}
		}
	}
	if n == nil {
		writeJSON(w, 404, map[string]any{"error": "item não está na análise"})
		return
	}
	full := filepath.Join(append([]string{s.root}, req.Parts...)...)
	if a.Demo || !isWindows() {
		writeJSON(w, 200, map[string]any{"ok": true, "demo": true, "path": full})
		return
	}
	var cmd *exec.Cmd
	if isDir {
		cmd = exec.Command("explorer.exe", full)
	} else {
		cmd = exec.Command("explorer.exe", "/select,"+full)
	}
	_ = cmd.Start()
	go cmd.Wait()
	writeJSON(w, 200, map[string]any{"ok": true, "path": full})
}
