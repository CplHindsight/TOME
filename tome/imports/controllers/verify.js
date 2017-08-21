import angular from 'angular';
import angularMeteor from 'angular-meteor';
import { Meteor } from 'meteor/meteor';

//Templates
import template from '../views/verify-email.html';

const name = 'verify';

export default angular.module(name, [
    angularMeteor,
])
    .controller("verifyController", function($scope, $reactive, $location, $routeParams){
        'ngInject';
        $reactive(this).attach($scope);
        Accounts.verifyEmail($routeParams.url);
        Meteor.setTimeout(()=>{$location.path("/dashboard"); $scope.$apply();}, 3000);
    })
    .component(name, {
        templateUrl: template
    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/verify-email/:url', {
            templateUrl: template
        });
}
