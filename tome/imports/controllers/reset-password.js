
import angular from 'angular';
import angularMeteor from 'angular-meteor';
import { Meteor } from 'meteor/meteor';

//Templates
import template from '../views/reset-password.html';

const name = 'resetPwd';

export default angular.module(name, [
    angularMeteor,
])
    .controller("resetController", function($scope, $reactive, $location, $routeParams){
        'ngInject';
        $reactive(this).attach($scope);

        this.warning = false;
        this.warningMessage = "";
        this.email = "";
        this.password = "";
        this.password2 = "";
        this.subscribe("users");

        this.updatePassword = () => {
            this.warning = false;
            this.warningMessage = "";
            var user = Meteor.users.findOne({"services.password.reset.token": $routeParams.url});
            console.log(user);
            if (!user || this.email !== user.emails[0].address) {
                this.warning = true;
                this.warningMessage = "You have arrived at a reset page for a different email. Please verify the correct URL to reset your password";
            }
            else if (this.password.length === 0 || this.password2.length === 0) {
                this.warning = true;
                this.warningMessage = "Neither your password nor password confirmation can be blank.";
            }
            else if (this.password !== this.password2) {
                this.warning = true;
                this.warningMessage = "The two passwords entered do not match. Please re-enter the new password.";
            }
            else {
                Accounts.resetPassword($routeParams.url, this.password);
                $location.path("/dashboard");
            }
        };

    })
    .component(name, {
        templateUrl: template
    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/reset-password/:url', {
            templateUrl: template
        });
}
