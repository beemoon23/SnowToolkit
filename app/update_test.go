package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestSameBuild(t *testing.T) {
	if !sameBuild("abc1234", "abc1234ffff") || sameBuild("abc1234", "def5678") || sameBuild("", "abc1234") {
		t.Fatal("sameBuild incorreto")
	}
}

func TestFetchRemoteAndDownload(t *testing.T) {
	payload := []byte("MZ" + string(make([]byte, 100)))
	sum := sha256.Sum256(payload)
	var srv *httptest.Server
	srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/rel" {
			fmt.Fprintf(w, `{"body":"build:1a2b3c4 — baixe","assets":[{"name":"SnowToolkit-Setup.exe","browser_download_url":"%s/setup","digest":""},{"name":"SnowToolkit.exe","browser_download_url":"%s/exe","digest":"sha256:%s"}]}`, srv.URL, srv.URL, hex.EncodeToString(sum[:]))
			return
		}
		w.Write(payload)
	}))
	defer srv.Close()
	old := updateAPI
	updateAPI = srv.URL + "/rel"
	defer func() { updateAPI = old }()

	ri, err := fetchRemote()
	if err != nil || ri.Build != "1a2b3c4" || ri.URL != srv.URL+"/exe" || ri.Digest != "sha256:"+hex.EncodeToString(sum[:]) {
		t.Fatalf("fetchRemote: %+v %v", ri, err)
	}
	dest := filepath.Join(t.TempDir(), "x.exe")
	got, err := downloadFile(ri.URL, dest)
	if err != nil || got != hex.EncodeToString(sum[:]) {
		t.Fatalf("downloadFile: %v %v", got, err)
	}
	if b, _ := os.ReadFile(dest); string(b) != string(payload) {
		t.Fatal("conteúdo diferente")
	}
}
