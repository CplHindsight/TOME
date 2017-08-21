import angular from 'angular';
import angularMeteor from 'angular-meteor';

//Templates
import template from '../views/login.html';

const name = 'login';

export default angular.module(name, [
    angularMeteor,
    'accounts.ui'
])
    .controller("loginController", function($scope, $reactive, $location){
        'ngInject';
        $reactive(this).attach($scope);

        this.helpers({

        });
        this.description = "Tournament Organization Made Easy (TOME) is a web application" +
            " designed for easy use to create and manage tournament style events.";
        this.startInfo = "Learn about our application by clicking the Help link below, sign in above to take " +
            "advantage of all TOME offers, " + "or create a quick tournament by clicking " +
            "the \"Quickfire Tournament\" button";

        this.beginQuickfire = ()=> {
            $location.path('/quickfire_tournament');
        };
    })
    .component(name, {
        templateUrl: template
    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/login', {
            templateUrl: template,
            resolve: {
                "currentUser": ["$meteor", function($meteor){
                    return $meteor.waitForUser();
                }]
            }
        });
}