#!/usr/bin/env nodejs
const mqtt = require('mqtt');
const config = require('./config');
const Rx = require('rxjs/Rx');//'rxjs/Rx';
const fetch = require('node-fetch');

/**
 * Handle the different ways an application can shutdown
 */
const processExit = Rx.Observable
  .fromEvent(process, 'exit')
  .map(() => {
    console.log("Exiting on 'exit'...");
  })
const processStop = Rx.Observable
  .fromEvent(process, 'SIGINT')
  .map(() => {
    console.log("Exiting on 'SIGINT'...");
  });
const processCrash = Rx.Observable
  .fromEvent(process, 'uncaughtException')
  .map(() => {
    console.log("Exiting on 'uncaughtException'...");
  })
const processEnd = Rx.Observable.merge(processExit, processStop, processCrash)


/**
 * Create a client connection
 */
console.log("connecting..." + config.mqttClient.url);
const client = mqtt.connect(config.mqttClient.url, config.mqttClient.options);

/**
 * Handle MQTT client events
 */
const mqttClientConnect$ = Rx.Observable
  .fromEvent(client, 'connect')
  .map(() => {
    console.log(`MQTT client connected to the server: ${config.mqttClient.url}`);
  });
const mqttClientReceiver$ = Rx.Observable
  .fromEvent(client, 'message')
  .map((topic, message) => {
    console.log(`MQTT client received message: ${message.toString()}`);
  });
const mqttClientError$ = Rx.Observable
  .fromEvent(client, 'error')
  .map((error) => {
    console.log(`MQTT client ERROR: ${error}`);
  });
const mqttClientOffline$ = Rx.Observable
  .fromEvent(client, 'offline')
  .map(() => {
    console.log("MQTT client is offline");
  });
const mqttClientReconnect$ = Rx.Observable
  .fromEvent(client, 'reconnect')
  .map(() => {
    console.log(`MQTT client is reconnecting to ${config.mqttClient.url}`);
  });
const mqttClientEvents$ = Rx.Observable
  .merge(
  mqttClientConnect$,
  mqttClientReceiver$,
  mqttClientError$,
  mqttClientOffline$,
  mqttClientReconnect$
  )
  .takeUntil(processEnd)
mqttClientEvents$.subscribe({ complete: () => client.end() })


/**
 * Helper function to render MQ message
 */

function formatCJPMessage(latestData) {
  const getValue = (rawValue) => {
      return rawValue ? (Math.round(rawValue * 100)/100).toFixed(2) : rawValue||null;
  }
  return {
    timestamp: Math.floor(Date.now() / 1000), // time when message was sent
    data_type: "CJP",
    subtype: 'GIOS',
    remark: config.gios.remark,
    location: { "x": 19.926189, "y": 50.057678 },
    zone: config.gios.zone,
    id: config.gios.id,
    ath: config.gios.ath,
    latest: {
      airQuality: {
        timestamp: Math.floor(Date.now() / 1000), // time when data were measured
        CO: getValue(latestData.CO),
        NO2: getValue(latestData.NO2),
        PM10: getValue(latestData.PM10),
        O3: getValue(latestData.O3),
        SO2: getValue(latestData.SO2)
      }
    }
  }
}

function getLatest(values) {
  let len = values.length;
  for (let i = 0; i < len; i++) {
    let v = values[i];
    if (v.value) {
      return v;
    }
  }
  return { 'value': null, 'date': null };
}

/**
 * Create data stream from the GIOS station
 */
const getStationParamsURL = (acc, params) => {
  // console.log(`Recieved station params: ${JSON.stringify(params)}`);
  acc = params;
  return acc;
}

function createParamsStream(stationParams) {
  return Rx.Observable.from(stationParams)
    .map(param => {
      // console.log(`param: ${JSON.stringify(param)}`);
      let paramUrl = config.gios.paramBaseUrl + param.id;
      console.log('calling: ' + paramUrl);
      return paramUrl;
    })
    .flatMap(requestUrl => fetch(requestUrl))
    .flatMap(response => response.json())
    .reduce(function (acc, data, idx, source) {
      let v = getLatest(data.values);
      acc[data.key] = v.value
      return acc;
    }, {})
    .map(latestData => formatCJPMessage(latestData))
}

const loop$ = Rx.Observable
  .interval(config.gios.period)  // repeat every period
  .takeUntil(processEnd)         // complete on process exit
  .startWith(0)                  // start immediatelly

const intervaRQ = function (stationParams) {
  return loop$.switchMapTo(createParamsStream(stationParams))
}

Rx.Observable
  .of(config.gios.stationUrl)
  .flatMap(requestUrl => fetch(requestUrl))
  .flatMap(response => response.json())
  .scan(getStationParamsURL, [])
  .filter((stationParams) => stationParams.length > 0)  // once we have station params URLs
  .switchMap(intervaRQ)                                 // start interval RQ to get values
  .subscribe({
    next: function (cjpData) {
      let msg = JSON.stringify(cjpData);
      let topic = 'ISIMPIO/Warsaw/GIOS/' + cjpData.id;
      client.publish(
        topic,
        msg,
        { qos: 1 },
        () => {
          console.log(`message ${msg} sent on ${topic}`);
        }
      );
      return msg;
    },
    error: function (err) { console.log('GIOS Stream Error: ' + err); },
    complete: function () { console.log('GIOS Stream Completed'); }
  })

