package main

import (
	"context"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func runScan(t *testing.T, root string) *scanState {
	t.Helper()
	s := &scanState{id: "t", root: root}
	s.state.Store("scanning")
	s.current.Store(root)
	s.run(context.Background(), false)
	if st, _ := s.state.Load().(string); st != "done" {
		t.Fatalf("estado = %v", st)
	}
	return s
}

func TestScanTotaisBatemComSomaIndependente(t *testing.T) {
	dir := t.TempDir()
	var want, wantFiles int64
	write := func(rel string, n int) {
		p := filepath.Join(dir, rel)
		_ = os.MkdirAll(filepath.Dir(p), 0o755)
		if err := os.WriteFile(p, make([]byte, n), 0o644); err != nil {
			t.Fatal(err)
		}
		want += int64(n)
		wantFiles++
	}
	write("a/video.mp4", 5000)
	write("a/b/doc.pdf", 700)
	write("a/b/c/x.dll", 123)
	write("z.txt", 10)
	// pasta com mais arquivos que o limite guardado individualmente
	for i := 0; i < keepFilesPerDir+50; i++ {
		write(fmt.Sprintf("many/f%04d.log", i), 10+i)
	}
	_ = os.MkdirAll(filepath.Join(dir, "vazia"), 0o755)

	s := runScan(t, dir)
	if s.tree.size != want || s.tree.count != wantFiles {
		t.Fatalf("total = %d bytes/%d arquivos, esperado %d/%d", s.tree.size, s.tree.count, want, wantFiles)
	}
	many := s.tree.find([]string{"many"})
	if many == nil || len(many.files) != keepFilesPerDir || many.otherCount != 50 {
		t.Fatalf("pasta many: guardados=%d outros=%d", len(many.files), many.otherCount)
	}
	if many.size != s.tree.dirs[0].size && many.size == 0 {
		t.Fatal("tamanho de many zerado")
	}
	// categorias somam o total
	var cs int64
	for _, c := range s.tree.cat {
		cs += c
	}
	if cs != want {
		t.Fatalf("soma das categorias = %d, esperado %d", cs, want)
	}
	if s.tree.cat[catVideo] != 5000 || s.tree.cat[catDoc] != 710 || s.tree.cat[catExe] != 123 {
		t.Fatalf("categorias erradas: %v", s.tree.cat)
	}
	// ordenação: maior ramo primeiro
	for i := 1; i < len(s.tree.dirs); i++ {
		if s.tree.dirs[i-1].size < s.tree.dirs[i].size {
			t.Fatal("pastas fora de ordem")
		}
	}
}

func TestEmitAgrupaMenoresEConservaTotal(t *testing.T) {
	s := runScan(t, ".")
	cnt := 0
	out := emit(s.tree, 3, s.tree.size/50, &cnt)
	var sum func(n tnode) int64
	sum = func(n tnode) int64 {
		var t int64
		for _, k := range n.K {
			t += k.S
		}
		if n.O != nil {
			t += n.O.S
		}
		return t
	}
	if sum(out) != out.S {
		t.Fatalf("filhos+outros = %d, pasta = %d", sum(out), out.S)
	}
	var walk func(n tnode)
	walk = func(n tnode) {
		if len(n.K) > 0 && sum(n) != n.S {
			t.Fatalf("%s: filhos+outros = %d, pasta = %d", n.N, sum(n), n.S)
		}
		for _, k := range n.K {
			walk(k)
		}
	}
	walk(out)
}

func TestVarreduraRealConfereComWalkDir(t *testing.T) {
	root := "/usr/share"
	if _, err := os.Stat(root); err != nil {
		t.Skip("sem /usr/share")
	}
	var want int64
	_ = filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.Type()&os.ModeSymlink != 0 {
			return nil
		}
		if !d.IsDir() {
			if i, e := d.Info(); e == nil {
				want += i.Size()
			}
		}
		return nil
	})
	s := runScan(t, root)
	if s.tree.size != want {
		t.Fatalf("scanner = %d, WalkDir = %d (dif %d)", s.tree.size, want, s.tree.size-want)
	}
	t.Logf("%s: %d bytes, %d arquivos, %d pastas OK", root, s.tree.size, s.tree.count, countDirs(s.tree))
}

func TestDemoTreeEFindNaoSaiDaArvore(t *testing.T) {
	d := demoScanTree()
	finalize(d)
	if d.size < 100<<30 {
		t.Fatalf("demo pequeno: %d", d.size)
	}
	if d.find([]string{"Users", "gui", "Downloads"}) == nil || d.find([]string{"..", "etc"}) != nil {
		t.Fatal("find incorreto")
	}
	h := &topHeap{}
	collectTop(d, nil, h, 5)
	if h.Len() != 5 {
		t.Fatalf("top = %d", h.Len())
	}
	if !strings.Contains(catNames[catVideo], "Vídeos") {
		t.Fatal("nomes de categoria")
	}
}
