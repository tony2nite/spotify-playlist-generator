'use strict';

angular.module('spotifyPlaylistGenerator', ['ngResource', 'ngRoute', 'ui.bootstrap','spotify'])
  .config(function (SpotifyProvider) {
    SpotifyProvider.setClientId('YOUR_CLIENT_ID');
    SpotifyProvider.setRedirectUri('http://localhost:3000/callback.html');
    SpotifyProvider.setScope('playlist-read-private playlist-modify-private');
  })
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'app/main/main.html',
        controller: 'MainCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
;