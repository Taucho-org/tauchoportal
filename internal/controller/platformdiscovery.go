package controller

import (
	"net/http"
	"net/url"
)

type PlatformDiscovery struct{ s *session }

type YouTubeChannel struct {
	ChannelId       string `json:"channel_id"`
	Title           string `json:"title"`
	Thumbnail       string `json:"thumbnail"`
	SubscriberCount int    `json:"subscriber_count"`
}

type YouTubeChannelsPage struct {
	Items         []YouTubeChannel `json:"items"`
	NextPageToken string           `json:"next_page_token"`
}

type TwitchChannel struct {
	ChannelId     string `json:"channel_id"`
	DisplayName   string `json:"display_name"`
	Thumbnail     string `json:"thumbnail"`
	FollowerCount int    `json:"follower_count"`
	IsLive        bool   `json:"is_live"`
}

type TwitchChannelsPage struct {
	Items  []TwitchChannel `json:"items"`
	Cursor string          `json:"cursor"`
}

type InstagramUser struct {
	UserId        string `json:"user_id"`
	Username      string `json:"username"`
	DisplayName   string `json:"display_name"`
	Thumbnail     string `json:"thumbnail"`
	FollowerCount int    `json:"follower_count"`
}

type InstagramUsersPage struct {
	Items []InstagramUser `json:"items"`
}

type FacebookPage struct {
	PageId    string `json:"page_id"`
	Name      string `json:"name"`
	Thumbnail string `json:"thumbnail"`
}

type FacebookPagesResponse struct {
	Items []FacebookPage `json:"items"`
}

type TikTokUser struct {
	UserId    string `json:"user_id"`
	Username  string `json:"username"`
	Nickname  string `json:"nickname"`
	Thumbnail string `json:"thumbnail"`
}

type TikTokUsersPage struct {
	Items []TikTokUser `json:"items"`
}

type XUser struct {
	UserId    string `json:"user_id"`
	Username  string `json:"username"`
	Name      string `json:"name"`
	Thumbnail string `json:"thumbnail"`
}

type XUsersPage struct {
	Items []XUser `json:"items"`
}

type KickChannel struct {
	ChannelId     string `json:"channel_id"`
	DisplayName   string `json:"display_name"`
	Thumbnail     string `json:"thumbnail"`
	FollowerCount int    `json:"follower_count"`
	IsLive        bool   `json:"is_live"`
}

type KickChannelsPage struct {
	Items  []KickChannel `json:"items"`
	Cursor string        `json:"cursor"`
}

type KickSearchResponse struct {
	Items []KickChannel `json:"items"`
}

type NicoNicoChannel struct {
	ChannelId     string `json:"channel_id"`
	Title         string `json:"title"`
	Thumbnail     string `json:"thumbnail"`
	FollowerCount int    `json:"follower_count"`
}

type NicoNicoSearchChannel struct {
	ChannelId    string `json:"channel_id"`
	Title        string `json:"title"`
	Thumbnail    string `json:"thumbnail"`
	IsLive       bool   `json:"is_live"`
	ViewerCount  int    `json:"viewer_count"`
	ProviderType string `json:"provider_type"`
}

type BilibiliErrorResponse struct {
	Error string `json:"error"`
}

type BilibiliUser struct {
	ChannelId     string `json:"channel_id"`
	Title         string `json:"title"`
	Thumbnail     string `json:"thumbnail"`
	FollowerCount int    `json:"follower_count"`
}

type BilibiliUsersPage struct {
	Items []BilibiliUser `json:"items"`
}

func (ctl PlatformDiscovery) ListMyYouTubeChannels() []YouTubeChannel {
	var result []YouTubeChannel
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/youtube/channels/mine")
	return result
}

func (ctl PlatformDiscovery) ListYouTubeSubscriptions(pageToken string) YouTubeChannelsPage {
	path := "/platform/youtube/subscriptions"
	if pageToken != "" {
		path += "?page_token=" + url.QueryEscape(pageToken)
	}

	var result YouTubeChannelsPage
	ctl.s.apiRequest(&result, http.MethodGet, path)
	return result
}

func (ctl PlatformDiscovery) SearchYouTubeChannels(query string, pageToken string) YouTubeChannelsPage {
	path := "/platform/youtube/search?q=" + url.QueryEscape(query)
	if pageToken != "" {
		path += "&page_token=" + url.QueryEscape(pageToken)
	}

	var result YouTubeChannelsPage
	ctl.s.apiRequest(&result, http.MethodGet, path)
	return result
}

func (ctl PlatformDiscovery) ListMyTwitchChannels() []TwitchChannel {
	var result []TwitchChannel
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/twitch/channels/mine")
	return result
}

func (ctl PlatformDiscovery) ListTwitchFollowing(cursor string) TwitchChannelsPage {
	path := "/platform/twitch/following"
	if cursor != "" {
		path += "?cursor=" + url.QueryEscape(cursor)
	}

	var result TwitchChannelsPage
	ctl.s.apiRequest(&result, http.MethodGet, path)
	return result
}

func (ctl PlatformDiscovery) SearchTwitchChannels(query string, cursor string) TwitchChannelsPage {
	path := "/platform/twitch/search?q=" + url.QueryEscape(query)
	if cursor != "" {
		path += "&cursor=" + url.QueryEscape(cursor)
	}

	var result TwitchChannelsPage
	ctl.s.apiRequest(&result, http.MethodGet, path)
	return result
}

func (ctl PlatformDiscovery) ListMyInstagramAccounts() []InstagramUser {
	var result []InstagramUser
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/instagram/user/mine")
	return result
}

func (ctl PlatformDiscovery) SearchInstagramUsers(query string) InstagramUsersPage {
	var result InstagramUsersPage
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/instagram/search?q="+url.QueryEscape(query))
	return result
}

func (ctl PlatformDiscovery) ListMyFacebookPages() []FacebookPage {
	var result []FacebookPage
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/facebook/page/mine")
	return result
}

func (ctl PlatformDiscovery) SearchFacebookPages(query string) FacebookPagesResponse {
	var result FacebookPagesResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/facebook/search?q="+url.QueryEscape(query))
	return result
}

func (ctl PlatformDiscovery) ListMyTikTokAccounts() []TikTokUser {
	var result []TikTokUser
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/tiktok/user/mine")
	return result
}

func (ctl PlatformDiscovery) SearchTikTokUsers(query string) TikTokUsersPage {
	var result TikTokUsersPage
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/tiktok/search?q="+url.QueryEscape(query))
	return result
}

func (ctl PlatformDiscovery) ListMyXAccounts() []XUser {
	var result []XUser
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/x/user/mine")
	return result
}

func (ctl PlatformDiscovery) SearchXUsers(query string) XUsersPage {
	var result XUsersPage
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/x/search?q="+url.QueryEscape(query))
	return result
}

func (ctl PlatformDiscovery) ListMyKickChannels() []KickChannel {
	var result []KickChannel
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/kick/channels/mine")
	return result
}

func (ctl PlatformDiscovery) ListKickFollowing(cursor string) KickChannelsPage {
	path := "/platform/kick/following"
	if cursor != "" {
		path += "?cursor=" + url.QueryEscape(cursor)
	}

	var result KickChannelsPage
	ctl.s.apiRequest(&result, http.MethodGet, path)
	return result
}

func (ctl PlatformDiscovery) SearchKickChannels(query string) KickSearchResponse {
	var result KickSearchResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/kick/search?q="+url.QueryEscape(query))
	return result
}

func (ctl PlatformDiscovery) ListMyNicoNicoChannels() []NicoNicoChannel {
	var result []NicoNicoChannel
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/niconico/channels/mine")
	return result
}

func (ctl PlatformDiscovery) SearchNicoNicoChannels(query string) []NicoNicoSearchChannel {
	var result []NicoNicoSearchChannel
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/niconico/search?q="+url.QueryEscape(query))
	return result
}

func (ctl PlatformDiscovery) GetMyBilibiliSpace() BilibiliErrorResponse {
	var result BilibiliErrorResponse
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/bilibili/user/mine")
	return result
}

func (ctl PlatformDiscovery) ListBilibiliFollowing(cursor string) BilibiliErrorResponse {
	path := "/platform/bilibili/following"
	if cursor != "" {
		path += "?cursor=" + url.QueryEscape(cursor)
	}

	var result BilibiliErrorResponse
	ctl.s.apiRequest(&result, http.MethodGet, path)
	return result
}

func (ctl PlatformDiscovery) SearchBilibiliUsers(query string) BilibiliUsersPage {
	var result BilibiliUsersPage
	ctl.s.apiRequest(&result, http.MethodGet, "/platform/bilibili/search?q="+url.QueryEscape(query))
	return result
}
