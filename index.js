/**
 * MIT License
 *
 * Copyright (c) 2017 Alisdair Smyth
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
**/
var ambi = require('node-ambiclimate');
var Service, Characteristic;

module.exports = function(homebridge) {
  Service        = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-ambiclimate-thermostat", "AmbiClimateThermostat", AmbiClimate);
}

function AmbiClimate(log, config) {
  this.log                    = log;
  this.name                   = config.name;
  this.settings               = {};
  this.settings.room_name     = config.roomName;
  this.settings.location_name = config.locationName;

  this.client = new ambi(config.clientId, config.clientSecret, config.username, config.password);

  // Object to maintain the state of the device.  This is done as there is
  // not official API to get this information.  If the Ambi Climate state is
  // changed through an alternative channel, that change will not be reflected
  // within Homekit
  this.state              = {};
  this.state.on           = false;

  this.thermostatService  = new Service.Thermostat(this.name);
  this.informationService = new Service.AccessoryInformation();
}

AmbiClimate.prototype = {
  getCurrentHeatingCoolingState: function(callback) {
    //
    // Map retrieved Ambi Climate mode to Homekit Heating, Cooling state.
    // Comfort mode can be heating or cooling, but as there is no indicator
    // of operating state this Ambi Climate mode is statically mapped to COOL.
    // Temperature mode is mapped by comparing current temperature with the set
    // temperature.
    //
    this.client.mode(this.settings)
      .then(  (data) => {
        var mode     = data.mode;
        var modeTemp = data.value;

        this.log("getCurrentHeatingCoolingState: Current Ambi Climate mode is " + mode);
        switch(mode) {
          case "Comfort":
          case "Away_Temperature_Upper":
            this.log("getCurrentHeatingCoolingState: Current state is COOL");
            callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
            break;
          case "Away_Temperature_Lower":
            this.log("getCurrentHeatingCoolingState: Current state is HEAT");
            callback(null, Characteristic.CurrentHeatingCoolingState.HEAT);
            break;
          case "Temperature":
            this.client.sensor_temperature(this.settings)
              .then( (data) => {
                var temp = data[0].value;

                if (temp > modeTemp) {
                  this.log("getCurrentHeatingCoolingState: Current state is COOL");
                  callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
                } else {
                  this.log("getCurrentHeatingCoolingState: Current state is HEAT");
                  callback(null, Characteristic.CurrentHeatingCoolingState.HEAT);
                }
              })
              .catch ( (reason) => {
                callback(reason);
              })
              break;
          default:
            this.log("getCurrentHeatingCoolingState: Current state is OFF");
            callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
            break;
        }
      })
      .catch( (reason) => {
        callback(reason);
      })
    },

  //
  // Target Heating Cooling State has the additional enumeration of AUTO.
  // If the Ambi Climate is in the mode of Comfort or Temperature, the
  // Target Heating Cooling State is set to AUTO.
  //
  getTargetHeatingCoolingState: function(callback) {
    this.client.mode(this.settings)
      .then( (data) => {
        var mode     = data.mode;
        var modeTemp = data.value;

        switch(mode) {
          case "Comfort":
          case "Temperature":
            this.log("getTargetHeatingCoolingState: Current state is AUTO");
            callback(null, Characteristic.TargetHeatingCoolingState.AUTO);
            break;
          case "Away_Temperature_Upper":
            this.log("getTargetHeatingCoolingState: Current state is COOL");
            callback(null, Characteristic.TargetHeatingCoolingState.COOL);
            break;
          case "Away_Temperature_Lower":
            this.log("getTargetHeatingCoolingState: Current state is HEAT");
            callback(null, Characteristic.TargetHeatingCoolingState.HEAT);
            break;
          default:
            this.log("getTargetHeatingCoolingState: Current state is OFF");
            callback(null, Characteristic.TargetHeatingCoolingState.OFF);
            break;
        }
      })
      .catch( (reason) => {
        callback(reason);
      })
  },

  //
  // AUTO -> Comfort
  // COOL -> Away Temperature Upper
  // HEAT -> Away Temperature Lower
  //
  setTargetHeatingCoolingState: function(value, callback) {
    this.log("setTargetHeatingCoolingState: Received value - " + value);
    switch(value) {
      case Characteristic.TargetHeatingCoolingState.AUTO:
        this.log("setTargetHeatingCoolingState: Setting to Comfort");
        this.client.comfort(this.settings)
          .then( (body) => {
            callback(null, body);
          })
          .catch( (reason) => {
            callback(reason);
          });
        break;
      case Characteristic.TargetHeatingCoolingState.COOL:
        this.log("setTargetHeatingCoolingState: Setting to Away Temperature Upper");
        this.settings.value = 22;
        this.log("setTargetHeatingCoolingState: this.settings - " + JSON.stringify(this.settings));
        this.client.away_temperature_upper(this.settings)
          .then( (body) => {
            this.log("setTargetHeatingCoolingState: body - " + JSON.stringify(body));
            callback(null, body);
          })
          .catch( (reason) => {
            callback(reason);
          });
        break;
      case Characteristic.TargetHeatingCoolingState.HEAT:
        this.log("setTargetHeatingCoolingState: Setting to Away Temperature Lower");
        this.settings.value = 22;
        this.log("setTargetHeatingCoolingState: this.settings - " + JSON.stringify(this.settings));
        this.client.away_temperature_lower(this.settings)
          .then( (body) => {
            this.log("setTargetHeatingCoolingState: body - " + JSON.stringify(body));
            callback(null, body);
          })
          .catch( (reason) => {
            callback(reason);
          });
        break;
      default:
        this.log("setTargetHeatingCoolingState: Setting to Off");
        this.client.off(this.settings)
          .then( (body) => {
            callback(null, body);
          })
          .catch( (reason) => {
            callback(reason);
          });
        break;
    }
  },

  getCurrentTemperature: function(callback) {
    this.client.sensor_temperature(this.settings)
      .then( (data) => {
        callback(null, data[0].value)
      })
      .catch( (reason) => {
        callback(reason)
      });
  },

  getTargetTemperature: function(callback) {
    this.client.mode(this.settings)
      .then( (data) => {
        var mode     = data.mode;
        var modeTemp = data.value;

        switch(mode) {
          case "Temperature":
          case "Away_Temperature_Upper":
          case "Away_Temperature_Lower":
            callback(null, modeTemp);
            break;
          default:
            callback(null, 22);
            break;
        }
      })
      .catch( (reason) => {
        callback(reason);
      });
  },

  //
  // Set the target temperature using the current Ambi Climate mode. A target
  // temperature is only relevant for Temperature, and Away Temperature modes.
  //
  setTargetTemperature: function(value, callback) {
    this.client.mode(this.settings)
      .then( (data) => {
        var mode     = data.mode;

        this.client.settings.value = value;
        switch(mode) {
          case "Temperature":
            this.client.temperature(this.client.settings)
              .then( (body) => {
                callback(null, body);
              })
              .catch( (reason) => {
                callback(reason);
              });
              break;
          case "Away_Temperature_Upper":
            this.client.away_temperature_upper(this.client.settings)
              .then( (body) => {
                callback(null, body);
              })
              .catch( (reason) => {
                callback(reason);
              });
            break;
          case "Away_Temperature_Lower":
            this.client.away_temperature_lower(this.client.settings)
              .then( (body) => {
                callback(null, body);
              })
              .catch( (reason) => {
                callback(reason);
              });
            break;
          default:
            callback(null);
            break;
        }

      })
      .catch( (reason) => {
        callback(reason);
      });
  },

  getTemperatureDisplayUnits: function(callback) {
    callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
  },

  getCurrentRelativeHumidity: function(callback) {
    this.client.sensor_humidity(this.settings)
      .then( (data) => {
        callback(null, data[0].value);
      })
      .catch ( (reason) => {
        callback(reason);
      });
  },

  //
  // Services
  //
  getServices: function () {
    this.thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .on('get', this.getCurrentHeatingCoolingState.bind(this));

    this.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('get', this.getTargetHeatingCoolingState.bind(this))
      .on('set', this.setTargetHeatingCoolingState.bind(this));

    this.thermostatService.getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getCurrentTemperature.bind(this));

    this.thermostatService.getCharacteristic(Characteristic.TargetTemperature)
      .on('get', this.getTargetTemperature.bind(this))
      .on('set', this.setTargetTemperature.bind(this));

    this.thermostatService.getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on('get', this.getTemperatureDisplayUnits.bind(this));

    this.thermostatService.getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', this.getCurrentRelativeHumidity.bind(this));

    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, "Ambi Labs")
      .setCharacteristic(Characteristic.Model, "Ambi Climate Thermostat")
      .setCharacteristic(Characteristic.SerialNumber, " ");

    return [this.thermostatService, this.informationService];
  }
}
