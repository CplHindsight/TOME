import angular from 'angular';
import angularMeteor from 'angular-meteor';

//Templates
import template from '../views/about.html';

const name = 'about';

export default angular.module(name, [
    angularMeteor,
])
    .controller("aboutController", function($scope, $reactive){
        'ngInject';
        $reactive(this).attach($scope);
    })
    .component(name, {
        templateUrl: template
    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/about', {
            templateUrl: template,
        });
}