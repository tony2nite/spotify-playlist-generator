'use strict';

angular.module('spotifyPlaylistGenerator')
  .controller('MainCtrl', ['$scope', 'Spotify', '$q', '$timeout', function ($scope, Spotify, $q, $timeout) {

    $scope.dynamic = 0;
    $scope.max = 100;

    $scope.playlistplaceholder = 'Spotify';
    $scope.loggedin = false;
    $scope.queries = [];
    $scope.alerts = [];
    $scope.tracks = [];

    $scope.status = [true, false, false];
    $scope.oneAtATime = false;
    $scope.search = {};
    $scope.search.artists = "";
    $scope.search.searchlimit = 5;

    var MAX_DELAY = 150;
    var MIN_DELAY = 850;

    /**
     * Private Functions
     */

    function log (msg) {
      return Math.floor(Math.random() * (max - min)) + min;
    }

    function randomBetween (min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    };

    function spotifyLogin () {
      var defer = $q.defer();
      Spotify.login().then(function (data) {
        console.log("login", data);
        $scope.loggedin = true;
      }).then(function (data){
        Spotify.getCurrentUser().then(function (data) {
          console.log("getCurrentUser", data);
          $scope.user = data.id;
          defer.resolve(data);
        })
      });
      return defer.promise;
    };

    function delayedRequest (delay, scope, promise, args) {
      var defer = $q.defer();

      $timeout(function() {
        defer.resolve(promise.apply(scope, args));
      }, delay);

      return defer.promise;
    };

    function sleepPromise (delay, payload) {
      console.log("sleepPromise", delay, payload);
      var defer = $q.defer();

      $timeout(function() {
        console.log("timeout", delay, payload);
        defer.resolve(payload);
      }, delay);

      return defer.promise;
    };

    function createPlaylist () {
      var defer = $q.defer();

      Spotify.createPlaylist($scope.user, { name: $scope.search.playlist, public: false})
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
            // Playlist created
            console.log(data);
            defer.resolve(data);
          });
        }
      );
      return defer.promise;
    };

    function getArtistTracks () {
      console.log('$scope.queries', $scope.queries);

      $scope.status = [true, true, true];

      var defer = $q.defer();
      var calls = [];

      for (var i = $scope.queries.length - 1; i >= 0; i--) {
        console.log('$scope.queries[i].selected', $scope.queries[i].selected);
        var selected = $scope.queries[i].selected;
        if (selected !== null && selected != -1) {
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
        defer.resolve();
      });

      return defer.promise;
    };

    function addAlert  (message) {
      $scope.alerts.push({type: 'success', msg: message});
    };


    /**
     * Public
     */
    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    };

    $scope.updatePlaylistNamePlaceholder = function() {
      var name = "Spotify";
      var search = $scope.search.artists.trim();
      if (search.length > 0) {
        name = search;
      }
      $scope.playlistplaceholder = name;
    };

    $scope.processPlaylist = function() {
      getArtistTracks()
        .then(spotifyLogin)
        .then(createPlaylist)
        .then(function(){
          addAlert('Playlist Created');
        });
    };

    $scope.searchArtist = function () {
      console.log('$scope.searchlimit',$scope.search.searchlimit);
      // $scope.search.artists = artists;     // This doesn't seem Angular but ng-model isn't being updated
      if (!$scope.search.artists || $scope.search.artists.length == 0) {
        return;
      }
      var terms = $scope.search.artists.trim().split('\n');
      $scope.dynamic = 0;
      $scope.status = [true, true, false];



      var counter = 0;
      function request (artist) {
        var defer = $q.defer();
        Spotify.search(artist, 'artist', {limit: $scope.search.searchlimit}).then(
          function(data) {
            console.log("Spotify.search", data);
            counter++;
            defer.notify(counter);
            $scope.dynamic = Math.round(counter / terms.length * $scope.max);
            var selected = data.artists.items.length > 0 ? data.artists.items[0].id : null;
            defer.resolve({q: artist, selected: selected, results: data});
          }
        );
        return defer.promise;
      }



      var calls = [];
      for (var i=0; i < terms.length; i++ ) {
        var delay = i * randomBetween(MIN_DELAY, MAX_DELAY);
        var delayed = sleepPromise(delay, terms[i]).
          then(
            function(payload) {
              console.log('payload', payload);
              console.log('requesting search...');
              return request(payload);
            });

          calls.push(delayed);
      }

      $q.all(calls).then(
        function (data) {
        // console.log(data);
        // $scope.dynamic = 0;
        $scope.queries = data;
        sleepPromise(500).then(function() {
          var offset = $('#accordion-results').offset();
          // $('body').scrollTop(offset.top);
          $('body').animate({scrollTop:offset.top}, '500');
        });
      }, function (data) {
        // Error
      }, function(data){
        // Notify
        console.log("notify", data);
      });
    };
  }]);
