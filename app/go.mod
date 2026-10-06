module snowtoolkit

go 1.22

require (
	github.com/jchv/go-webview2 v0.0.0-20250406163304
	github.com/jchv/go-winloader v0.0.0-20250406163304-c1995be93bd1
	golang.org/x/sys v0.30.0
)

// Dependencias locais (vendor): permitem compilar sem acesso ao proxy do Go.
replace github.com/jchv/go-webview2 => ../third_party/go-webview2

replace github.com/jchv/go-winloader => ../third_party/go-winloader

replace golang.org/x/sys => ../third_party/sys
