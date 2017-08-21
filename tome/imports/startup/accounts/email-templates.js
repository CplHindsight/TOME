import { Accounts } from 'meteor/accounts-base';

const name = 'TOME';
const email = '<support@tome.com>';
const from = `${name} ${email}`;
const emailTemplates = Accounts.emailTemplates;

emailTemplates.siteName = name;
emailTemplates.from = from;


Accounts.emailTemplates.siteName = "Tome";
Accounts.emailTemplates.from     = `Tome Admin <admin@localhost>`;

Accounts.emailTemplates.verifyEmail = {
    subject() {
        return `[${name}] Verify Your Email Address`;
    },
    text( user, url ) {
        let emailAddress   = user.emails[0].address,
            urlWithoutHash = url.replace( '#/', '' ),
            supportEmail   = "support@tome.com",
            emailBody      = `To verify your email address (${emailAddress}) visit the following link:\n\n${urlWithoutHash}\n\n ` +
                "If you did not request this verification, please ignore this email. If you feel something is wrong," +
                `please contact our support team: ${supportEmail}.`;

        return emailBody;
    }
};

emailTemplates.resetPassword = {
    subject() {
        return `[${name}] Reset Your Password`;
    },
    text(user, url) {
        let emailAddress   = user.emails[0].address,
            urlWithoutHash = url.replace( '#/', '' ),
            supportEmail   = "support@tome.com",
            emailBody =  "A password reset has been requested for the account related to this" +
                `address (${emailAddress}). To reset the password, visit the following link:` +
                `\n\n${urlWithoutHash}\n\n If you did not request this reset, please ignore ` +
                "this email. If you feel something is wrong, please contact our support team: " +
                `${supportEmail}.`;

        return emailBody;
    },
};



import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Email } from 'meteor/email';

Meteor.methods({
    sendMessage(message) {
        check(message, Object);

        Meteor.defer(() => {
            Email.send({
                from: from,
                to: "${message.name} ${message.email}",
                subject: "${message.name} sent a message!",
                text: message.message,
            });
        });
    },
});