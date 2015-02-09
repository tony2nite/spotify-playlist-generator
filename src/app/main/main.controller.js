'use strict';

angular.module('spotifyPlaylistGenerator')
  .controller('MainCtrl', ['$scope', 'Spotify', '$q', '$timeout', function ($scope, Spotify, $q, $timeout) {


    $scope.dynamic = 0;
    $scope.max = 100;
    $scope.searchlimit = 3;
    $scope.playlistplaceholder = 'Spotify';
    $scope.loggedin = false;
    $scope.queries = [];

    var MAX_DELAY = 150;
    var MIN_DELAY = 850;

    /**
     * Private Functions
     */
    var randomBetween = function(min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    };

    var delayedRequest = function(delay, scope, promise, args) {
      var defer = $q.defer();

      $timeout(function() {
        defer.resolve(promise.apply(scope, args));
      }, delay);

      return defer.promise;
    }


    /**
     * Public
     */

    $scope.updatePlaylistNamePlaceholder = function() {
      var name = "Spotify";
      var search = $scope.searchartist.trim();
      if (search.length > 0) {
        name = search;
      }
      $scope.playlistplaceholder = name;
    }

    $scope.login = function () {
      Spotify.login().then(function (data) {
        console.log(data);
        alert("You are now logged in");
        $scope.loggedin = true;
        // Spotify.getCurrentUser().then(function (data) {
        //   console.log(data);
        //   $scope.user = data.id;
        // })
      }).then(function (data){
        Spotify.getCurrentUser().then(function (data) {
          console.log(data);
          $scope.user = data.id;
        })
      });
    };

    $scope.getArtistTracks = function () {
      console.log($scope.queries);

      var calls = [];
      for (var i = $scope.queries.length - 1; i >= 0; i--) {
        // console.log($scope.queries[i].selected);
        if ($scope.queries[i].selected !== null) {
          calls.push(delayedRequest(
            i * randomBetween(MIN_DELAY, MAX_DELAY), 
            Spotify, Spotify.getArtistTopTracks, [$scope.queries[i].selected, 'GB']
            ));
        }
      };
      $q.all(calls).then(function (data) {
        console.log(data);
        var tracks = [];
        for (var i = data.length - 1; i >= 0; i--) {
          tracks = tracks.concat(data[i].tracks);
        };
        console.log(tracks);
        // $scope.dynamic = 0;
        $scope.tracks = tracks;
      });
    };

    $scope.searchArtist = function () {
      if (!$scope.searchartist || $scope.searchartist.length == 0) {
        return;
      }
      var terms = $scope.searchartist.trim().split('\n');
      $scope.dynamic = 0;

      var counter = 0;
      var request = function (artist) {
        var defer = $q.defer();
        Spotify.search(artist, 'artist', {limit: $scope.searchlimit}).then(
          function(data) {
            // console.log(counter, $scope.max);
            console.log(data);
            counter++;
            $scope.dynamic = Math.round(counter / terms.length * $scope.max);
            var selected = data.artists.items.length > 0 ? data.artists.items[0].id : null;
            defer.resolve({q: artist, selected: selected, results: data});
          }
        );
        return defer.promise;
      }

      var calls = [];
      for (var i=0; i < terms.length; i++ ) {
        calls.push(delayedRequest(i * randomBetween(MIN_DELAY, MAX_DELAY), this, request, [terms[i]]));
      }
      $q.all(calls).then(function (data) {
        console.log(data);
        // $scope.dynamic = 0;
        $scope.queries = data;
      });
    };

    $scope.createPlaylist = function() {
      Spotify.createPlaylist($scope.user, { name: $scope.playlist, public: false})
      .then(
        function (data) {
          console.log('playlist created', data);
          $scope.playlistid = data.id;
        }, 
        function(reason) {
          alert('Failed: ' + reason);
        }
      ).then(
        function (data) {
          var ids = [];
          var calls = [];
          var CHUNK_SIZE = 30;                                      // The post data is too long unless we break it up
         for (var i = $scope.tracks.length - 1; i >= 0; i--) {
            ids.push($scope.tracks[i].id);
            if ((ids.length % CHUNK_SIZE) == 0) {
              // console.log('call', ids);
              calls.push(delayedRequest(i * randomBetween(MIN_DELAY, MAX_DELAY), Spotify, Spotify.addPlaylistTracks, [$scope.user, $scope.playlistid, ids]));
              ids = [];
            }
          };
          if (ids.length > 0) {
            calls.push(delayedRequest(i * randomBetween(MIN_DELAY, MAX_DELAY), Spotify, Spotify.addPlaylistTracks, [$scope.user, $scope.playlistid, ids]));
            ids = [];
          }
          $q.all(calls).then(function (data) {
            console.log(data);
          });
        }
      );
    }
  }]);
