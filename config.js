let config = {};

config.mqttClient = { // mosca MQTT broker settings
    // url: 'mqtt://localhost',
    url: 'mqtt://csa.net.pl',
    options: {
        port: 1883,
        clientId: 'GIOS-COLLECTOR',
        username: 'my_username',
        password: 'my_password',
    },
};

config.gios = {
    stationUrl: 'http://api.gios.gov.pl/pjp-api/rest/station/sensors/400',  // Krakow
    paramBaseUrl: 'http://api.gios.gov.pl/pjp-api/rest/data/getData/',
    remark: 'Aleja Krasińskiego',
    location: {x:50.057678, y:19.926189},
    zone: null,
    id: 'CJP:101',
    ath: null, // 2c8c5f6c-4511-11e7-a919-92ebcb67fe33
    // period: 10000,
    period: 1200000 // # of miliseconds to refresh station data
}

module.exports = config;