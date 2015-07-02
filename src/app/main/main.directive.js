angular.module('spotifyPlaylistGenerator')
.directive('noArtistDirective', function($rootScope) {

    return {
        restrict: 'A',
        scope: true,
        require: 'ngModel',
        link: function($scope, $element, $attrs, $model){
          $scope.clicked = 0;
          $scope.click = function(){
            console.log('clicked', $model);
            console.log($scope.queries);
            $model.selected = 99;
            $scope.clicked++;
          }
        }
    };

});
