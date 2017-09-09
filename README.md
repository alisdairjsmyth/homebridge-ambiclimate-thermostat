# homebridge-ambiclimate-thermostat
[![NPM Version](https://img.shields.io/npm/v/homebridge-ambiclimate-thermostat.svg)](https://www.npmjs.com/package/homebridge-ambiclimate-thermostat)
[![Dependency Status](https://img.shields.io/versioneye/d/nodejs/homebridge-ambiclimate-thermostat.svg)](https://www.versioneye.com/nodejs/homebridge--thermostat/)

[Ambi Climate](https://www.ambiclimate.com/) plugin for [homebridge](https://www.npmjs.com/package/homebridge) supporting Thermostat capabilities.  This plugin presently supports:
* Current heating cooling state
* Target heating cooling state
* Current temperature
* Target temperature
* Current relative humidity

## Installation

    npm install -g homebridge-ambiclimate-thermostat

This plugin augments a pre-existing implementation of [homebridge](https://www.npmjs.com/package/homebridge).  Refer to [nfarina/homebridge](https://www.npmjs.com/package/homebridge) for installation instructions.

Register a OAuth Client in the <a href="https://api.ambiclimate.com/" target="_new">Ambi Dev Portal</a> for each Ambi Climate device by following the steps on the Quick Start page.  You require the Client Id and Client Secret of that client in order to use this wrapper.

Update your homebridge configuration file (as below).

## Configuration

    "accessories" : [
        {
            "accessory": "AmbiClimateThermostat",
            "name": "<Name for Accessory>",
            "roomName": "<Name of Ambi Climate Device>",
            "locationName": "<Name of Ambi Climate Location>",
            "clientId": "<Ambi Climate OAuth Client Id>",
            "clientSecret": "<Ambi Climate OAuth Client Secret>",
            "username": "<Ambi Climate Username>",
            "password": "<Ambi Climate Password>"
        }
    ]

Separate homebridge accessories can be defined for each Ambi Climate device to be controlled.  
* `accessory`: Must be "AmbiClimateThermostat"
* `name`: Can be anything, this will be the name of the Accessory within HomeKit Apps
* `room_name`: Must match the value within the Ambi Climate App
* `location_name`: Must match the value within the Ambi Climate App
* `clientId`: The Client Id value for the OAUTH Client obtained from Ambi Dev Portal
* `clientSecret`: The Client Secret value for the OAUTH Client obtained from Ambi Dev Portal
* `username`: Your Ambi Climate username
* `password`: Your Ambi Climate password

## To Do
* Refactor to a Platform plugin.  This is predicated on Ambi Labs exposing a capability in their public API to retrieve all devices installed in a given location.
* Implement Fan Service. This is predicated on Ambi Labs exposing a capability in their public API to get and set fan state.
