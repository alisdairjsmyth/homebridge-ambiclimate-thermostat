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
        // Comfort mode can be heating or cooling, but as there is no
        // indicator of operating state this Ambi Climate mode is statically
        // mapped to COOL.
        // Temperature mode is mapped by comparing current temperature with
        // the set temperature.
        //
        this.client.mode(this.settings, function(err, data) {
            if (err) {
                callback(err);
            }
            var mode     = data.mode;
            var modeTemp = data.value;
            this.log("Retrieved mode is " + mode);

            switch(mode) {
                case "Comfort":
                case "Away_Temperature_Upper":
                    callback(err, Characteristic.CurrentHeatingCoolingState.COOL);
                case "Away_Temperature_Lower":
                    callback(err, Characteristic.CurrentHeatingCoolingState.HEAT);
                case "Temperature":
                    this.client.sensor_temperature(accessory.settings, function (err, data) {
                        if (err) {
                          callback(err);
                        }
                        var temp = data[0].value;

                        if (temp > modeTemp) {
                          callback(err, Characteristic.CurrentHeatingCoolingState.COOL);
                        } else {
                          callback(err, Characteristic.CurrentHeatingCoolingState.HEAT);
                        }
                    })
                default:
                    callback(err, Characteristic.CurrentHeatingCoolingState.OFF);
            }
        })
    },

    //
    // Target Heating Cooling State has the additional enumeration of AUTO.
    // If the Ambi Climate is in the mode of Comfort or Temperature, the
    // Target Heating Cooling State is set to AUTO.
    //
    getTargetHeatingCoolingState: function(callback) {
      this.client.mode(this.settings, function(err, data) {
          if (err) {
              callback(err);
          }
          var mode     = data.mode;
          var modeTemp = data.value;

          switch(mode) {
              case "Comfort":
              case "Temperature":
                  callback(err, Characteristic.TargetHeatingCoolingState.AUTO);
              case "Away_Temperature_Upper":
                  callback(err, Characteristic.TargetHeatingCoolingState.COOL);
              case "Away_Temperature_Lower":
                  callback(err, Characteristic.TargetHeatingCoolingState.HEAT);
              default:
                  callback(err, Characteristic.TargetHeatingCoolingState.OFF);
          }
      })
    },

    //
    // AUTO -> Comfort
    // COOL -> Away Temperature Upper
    // HEAT -> Away Temperature Lower
    //
    setTargetHeatingCoolingState: function(value, callback) {
        switch(value) {
            case Characteristic.TargetHeatingCoolingState.AUTO:
                this.client.comfort(this.settings, function(err, data) {
                    callback(err);
                });
            case Characteristic.TargetHeatingCoolingState.COOL:
                this.client.away_temperature_upper(this.settings, function(err, data) {
                    callback(err);
                });
            case Characteristic.TargetHeatingCoolingState.HEAT:
                this.client.away_temperature_lower(this.settings, function(err, data) {
                    callback(err);
                });
            default:
                this.client.off(this.settings, function(err, data) {
                    callback(err);
                });
        }
    },

    getCurrentTemperature: function(callback) {
        this.client.sensor_temperature(this.settings, function (err, data) {
            (err) ? callback(err, null) : callback(err, data[0].value);
        });
    },

    getTargetTemperature: function(callback) {
      this.client.mode(this.settings, function(err, data) {
          if (err) {
              callback(err);
          }
          var mode     = data.mode;
          var modeTemp = data.value;

          switch(mode) {
              case "Temperature":
              case "Away_Temperature_Upper":
              case "Away_Temperature_Lower":
                  callback(null, modeTemp);
              default:
                  callback(null, 22);
          }
      })
    },

    //
    // Set the target temperature using the current Ambi Climate mode. A
    // target temperature is only relevant for Temperature, and Away
    // Temperature modes.
    //
    setTargetTemperature: function(value, callback) {
        this.client.mode(this.settings, function(err, data) {
            if (err) {
                callback(err);
            }
            var mode     = data.mode;

            this.client.settings.value = value;
            switch(mode) {
                case "Temperature":
                    this.client.temperature(this.client.settings, function(err,data) {
                        callback(err);
                    });
                case "Away_Temperature_Upper":
                    this.client.away_temperature_upper(this.client.settings, function(err,data) {
                        callback(err);
                    });
                case "Away_Temperature_Lower":
                    this.client.away_temperature_lower(this.client.settings, function(err,data) {
                        callback(err);
                    });
                default:
                    callback(null);
            }
        });
    },

    getTemperatureDisplayUnits: function(callback) {
        callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
    },

    getCurrentRelativeHumidity: function(callback) {
        this.client.sensor_humidity(this.settings, function (err, data) {
            (err) ? callback(err) : callback(err, data[0].value);
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

        return [this.thermostatService];
    }
}
