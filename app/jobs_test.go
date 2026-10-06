package main

import (
	"strings"
	"testing"
)

// No Windows o PowerShell escreve cada linha terminada em \r\n; uma barra de progresso termina em \r + \r\n.
func TestPumpMarcaProgressoENaoGeraLinhasVazias(t *testing.T) {
	j := &Job{notify: make(chan struct{})}
	in := "Verificação 10% concluída.\r\r\nVerificação 37% concluída.\r\r\nA operação foi concluída.\r\n\x00\r\n"
	pump(strings.NewReader(in), "o", j)
	var got []Line
	got = append(got, j.lines...)
	want := []struct {
		t string
		r bool
	}{{"Verificação 10% concluída.", true}, {"Verificação 37% concluída.", true}, {"A operação foi concluída.", false}}
	if len(got) < len(want) {
		t.Fatalf("linhas = %d (%v)", len(got), got)
	}
	for i, w := range want {
		if got[i].T != w.t || got[i].R != w.r {
			t.Fatalf("linha %d = %+v, esperado %q R=%v", i, got[i], w.t, w.r)
		}
	}
	// o NUL solto vira linha vazia depois do filtro de add(): nao deve sobrar caractere nulo
	for _, l := range got {
		if strings.ContainsRune(l.T, 0) {
			t.Fatalf("NUL na linha %q", l.T)
		}
	}
}
