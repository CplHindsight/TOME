import angular from 'angular';
import angularMeteor from 'angular-meteor';

import { Meteor } from 'meteor/meteor';

import template from '../views/navigation.html';

const name = 'navigation';

export default angular.module(name, [
    angularMeteor
])
    .controller("navigationController", function($scope, $reactive){
        'ngInject';
        $reactive(this).attach($scope);
    })
    .component(name, {
        templateUrl: template
    });