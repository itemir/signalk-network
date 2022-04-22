/*
 * Copyright 2022 Ilker Temir <ilker@ilkertemir.com>
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const POLL_INTERVAL = 5      // Poll every N minutes

const os = require('os');
const request = require('request')
const networks = os.networkInterfaces();

module.exports = function(app) {
  var plugin = {};
  var pollProcess;

  plugin.id = "signalk-network";
  plugin.name = "Network";
  plugin.description = "Starlink plugin for obtaining network information";

  plugin.schema = {
    type: 'object',
    required: [],
    properties: {}
  }
  
  function getAndPublishInterfaceData() {
      for (let interface in networks) {
	let configurations = networks[interface];
	for (let i in configurations) {
  	  let configuration = configurations[i];
	  if (configuration.internal == false) {
  	    let httpOptions = {
              uri: 'https://api.ipify.org?format=json',
	      localAddress: configuration.address,
	      json: true
      	    };
            request(httpOptions, function (error, response, body) {
	      let values;
	      if (!error || (response && response.statusCode == 200)) {
	        values = [
	      	  {
	            path: `network.interfaces.${interface}.ip_address`,
	            value: configuration.cidr
	          },
	      	  {
	            path: `network.interfaces.${interface}.mac_address`,
	            value: configuration.mac
	          },
	      	  {
	            path: `network.interfaces.${interface}.address_family`,
	            value: configuration.family
	          },
	      	  {
	            path: `network.interfaces.${interface}.public_ip_address`,
	            value: body.ip
	          },
	        ];
              } else {
	        values = [
	      	  {
	            path: `network.interfaces.${interface}.ip_address`,
	            value: configuration.cidr
	          },
	      	  {
	            path: `network.interfaces.${interface}.mac_address`,
	            value: configuration.mac
	          },
	      	  {
	            path: `network.interfaces.${interface}.address_family`,
	            value: configuration.family
	          },
	      	  {
	            path: `network.interfaces.${interface}.public_ip_address`,
	            value: 'unavailable'
	          },
	        ];
	      }
	      app.handleMessage('signalk-network', {
                updates: [
                  {
                    values: values
                  }
                ]
              });
	    });
	  }
	}
      }
  }

  plugin.start = function(options) {
    getAndPublishInterfaceData();
    pollProcess = setInterval( function() {
      getAndPublishInterfaceData();
    }, POLL_INTERVAL * 60 * 1000);
  }

  plugin.stop =  function() {
    clearInterval(pollProcess);
    app.setPluginStatus('Pluggin stopped');
  };

  return plugin;
}
