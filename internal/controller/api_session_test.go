package controller

import (
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
)

// Concurrent page renders must each reach the API with their own visitor's
// cookie and user ID. Before per-request sessions these were package globals.
func TestConcurrentRequestsKeepTheirOwnSession(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		c, _ := r.Cookie("tauchoportal_session")
		cookie := ""
		if c != nil {
			cookie = c.Value
		}
		_, _ = w.Write([]byte(`{"id":1,"email":"` + cookie + `|` + r.Header.Get("X-User-ID") + `"}`))
	}))
	defer server.Close()

	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			user := string(rune('a' + i%26))
			incoming := httptest.NewRequest(http.MethodGet, "/dashboard", nil)
			incoming.AddCookie(&http.Cookie{Name: "tauchoportal_session", Value: "token-" + user})
			api := New(server.URL, "uid-"+user, incoming)
			for j := 0; j < 5; j++ {
				got := api.Auth.GetCurrentUser().Email
				if want := "token-" + user + "|uid-" + user; got != want {
					t.Errorf("request %d saw %q, want %q", i, got, want)
					return
				}
			}
		}(i)
	}
	wg.Wait()
}

func TestZeroValueControllerDoesNotPanic(t *testing.T) {
	_ = Watches{}.ListWatches()
}
