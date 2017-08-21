import { Leagues } from '../imports/models/leagues';
import { Tournaments } from '../imports/models/tournaments';

if(Meteor.isServer){
    Meteor.publish('users', ()=> {
        return Meteor.users.find();
    });
}

Accounts.onCreateUser(function(options, user) {
    //console.log("\n\n\nuser\n------------");
    //console.log(user._id);
    //console.log("\n\n\noptions\n---------");
    //console.log(options);

    var service = _.keys(user.services)[0];
    var email = "";
    var existingUser = null;
    if (service === "facebook") {
        email = user.services[service].email;
        existingUser = Meteor.users.findOne({'emails.address': email});
        user.profile = options.profile;
        if (!existingUser) {
            return user;
        }
        else {
            user.emails = existingUser.emails;
        }
    }
    else { //service === "password"
        email = user.emails[0].address;
        user.profile = {name: email};
        existingUser = Meteor.users.findOne({'services.facebook.email': email});
        if (!existingUser) {
            if (Meteor.isSimulation) {
                Meteor.setTimeout(function () {
                    Accounts.sendVerificationEmail(user._id);
                }, 2 * 1000);
            }
            return user;
        }
        else {
            user.profile = existingUser.profile; //gets name, rather than email
        }
    }


    //associate existing leagues and tournaments with new _id
    Leagues.update({organizerId: existingUser._id}, {$set :{organizerId: user._id}});
    Tournaments.update({organizerId: existingUser._id}, {$set: {organizerId: user._id}});

    // copy across new service info
    for (var x in existingUser.services) {
        if (!user.services[x])
            user.services[x] = existingUser.services[x];
        else if (x === 'resume') {
            for (var i=0; i < existingUser.services.resume.length; i++)
                user.services.push(existingUser.services.resume[i]);
        }
    }
    user.createdAt = existingUser.createdAt;
    Meteor.users.remove(existingUser._id);

    return user;
});

Accounts.validateLoginAttempt(function(options) {
    /* options:
        type            (String)    The service name, such as "password" or "twitter".
        allowed         (Boolean)   Whether this login is allowed and will be successful.
        error           (Error)     When allowed is false, the exception describing why the login failed.
        user            (Object)    When it is known which user was attempting to login, the Meteor user object.
        connection      (Object)    The connection object the request came in on.
        methodName      (String)    The name of the Meteor method being used to login.
        methodArguments (Array)     An array of the arguments passed to the login method
    */

    // If the login has failed, just return false.
    if (!options.allowed) {
        return false;
    }
    else if (options.type === "facebook" || options.type === "resume") {
        return true;
    }
    // Check the user's email is verified. If users may have multiple 
    // email addresses (or no email address) you'd need to do something
    // more complex.
    if (options.user.emails[0].verified === true) {
        return true;
    } else {
        throw new Meteor.Error('email-not-verified', 'You must verify your email address before you can log in');
    }

});



Accounts.config({sendVerificationEmail: true, 
    forbidClientAccountCreation: false});

