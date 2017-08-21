import { ServiceConfiguration } from 'meteor/service-configuration';

ServiceConfiguration.configurations.remove({
    service: "facebook"
});

ServiceConfiguration.configurations.insert({
    service: "facebook",
    appId: '116472875613924',
    secret: '5ca83c6c6015145433bdaab41255eeab'
});