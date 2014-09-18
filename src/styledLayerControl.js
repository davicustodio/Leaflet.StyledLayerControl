L.Control.StyledLayerControl = L.Control.Layers.extend({
		options : {
			collapsed : true,
			position : 'topright',
			autoZIndex : true
		},

		initialize : function (baseLayers, groupedOverlays, options) {
			var i,
			j;
			L.Util.setOptions(this, options);

			this._layers = {};
			this._lastZIndex = 0;
			this._handlingClick = false;
			this._groupList = [];
			this._domGroups = [];

			for (i in baseLayers) {
				for (var j in baseLayers[i].layers) {
					this._addLayer(baseLayers[i].layers[j], j, baseLayers[i].groupName, baseLayers[i].expanded, false);
				}
			}

			for (i in groupedOverlays) {
				for (var j in groupedOverlays[i].layers) {
					this._addLayer(groupedOverlays[i].layers[j], j, groupedOverlays[i].groupName, groupedOverlays[i].expanded, true);
				}
			}
			
			
		},

		onAdd : function (map) {
			this._initLayout();
			this._update();

			map
			.on('layeradd', this._onLayerChange, this)
			.on('layerremove', this._onLayerChange, this);

			return this._container;
		},

		onRemove : function (map) {
			map
			.off('layeradd', this._onLayerChange)
			.off('layerremove', this._onLayerChange);
		},

		addBaseLayer : function (layer, name) {
			this._addLayer(layer, name);
			this._update();
			return this;
		},

		addOverlay : function (layer, name, group) {
			this._addLayer(layer, name, group, true);
			this._update();
			return this;
		},

		removeLayer : function (layer) {
			var id = L.Util.stamp(layer);
			delete this._layers[id];
			this._update();
			return this;
		},

		_initLayout : function () {
			var className = 'leaflet-control-layers',
			container = this._container = L.DomUtil.create('div', className);

			//Makes this work on IE10 Touch devices by stopping it from firing a mouseout event when the touch is released
			container.setAttribute('aria-haspopup', true);

			if (!L.Browser.touch) {
				L.DomEvent.disableClickPropagation(container);
				L.DomEvent.on(container, 'wheel', L.DomEvent.stopPropagation);
			} else {
				L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
			}

			
			var section = document.createElement('section');
			section.className = 'ac-container ' + className + '-list';
			
			var form = this._form = L.DomUtil.create('form');
			
			section.appendChild( form );

			if (this.options.collapsed) {
				if (!L.Browser.android) {
					L.DomEvent
					.on(container, 'mouseover', this._expand, this)
					.on(container, 'mouseout', this._collapse, this);
				}
				var link = this._layersLink = L.DomUtil.create('a', className + '-toggle', container);
				link.href = '#';
				link.title = 'Layers';

				if (L.Browser.touch) {
					L.DomEvent
					.on(link, 'click', L.DomEvent.stop)
					.on(link, 'click', this._expand, this);
				} else {
					L.DomEvent.on(link, 'focus', this._expand, this);
				}

				this._map.on('click', this._collapse, this);
				// TODO keyboard accessibility
				
			} else {
				this._expand();
			}

			this._baseLayersList = L.DomUtil.create('div', className + '-base', form);
			this._overlaysList = L.DomUtil.create('div', className + '-overlays', form);

			container.appendChild(section);
			
			// process options of accordionLayers
			for(var c = 0; c < (containers = container.getElementsByClassName('ac-container')).length; c++ ){
				if (this.options.container_width) {
					containers[c].style.width = options.container_width;
				}	
					
				// set the max-height of control to y value of map object
				
				containers[c].style.maxHeight = (this._map._size.y - 70) + "px";
			}	
		
			
		},

		_addLayer : function (layer, name, group, groupExpanded, overlay) {
			var id = L.Util.stamp(layer);

			this._layers[id] = {
				layer : layer,
				name : name,
				overlay : overlay
			};

			if (group) {
				var groupId = this._groupList.indexOf(group);

				if (groupId === -1) {
					groupId = this._groupList.push(group) - 1;
				}

				this._layers[id].group = {
					name : group,
					id : groupId,
					expanded : groupExpanded
				};
			}

			if (this.options.autoZIndex && layer.setZIndex) {
				this._lastZIndex++;
				layer.setZIndex(this._lastZIndex);
			}
		},

		_update : function () {
			if (!this._container) {
				return;
			}

			this._baseLayersList.innerHTML = '';
			this._overlaysList.innerHTML = '';
			this._domGroups.length = 0;

			var baseLayersPresent = false,
			overlaysPresent = false,
			i,
			obj;

			for (i in this._layers) {
				obj = this._layers[i];
				this._addItem(obj);
				overlaysPresent = overlaysPresent || obj.overlay;
				baseLayersPresent = baseLayersPresent || !obj.overlay;
			}
		
		},

		_onLayerChange : function (e) {
			var obj = this._layers[L.Util.stamp(e.layer)];

			if (!obj) {
				return;
			}

			if (!this._handlingClick) {
				this._update();
			}

			var type = obj.overlay ?
				(e.type === 'layeradd' ? 'overlayadd' : 'overlayremove') :
				(e.type === 'layeradd' ? 'baselayerchange' : null);

			if (type) {
				this._map.fire(type, obj);
			}
		},

		// IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
		_createRadioElement : function (name, checked) {

			var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name + '"';
			if (checked) {
				radioHtml += ' checked="checked"';
			}
			radioHtml += '/>';

			var radioFragment = document.createElement('div');
			radioFragment.innerHTML = radioHtml;

			return radioFragment.firstChild;
		},

		_addItem : function (obj) {
			var label = document.createElement('div'),
			input,
			checked = this._map.hasLayer(obj.layer),
			container;
		

			if (obj.overlay) {
				input = document.createElement('input');
				input.type = 'checkbox';
				input.className = 'leaflet-control-layers-selector';
				input.defaultChecked = checked;
				
				label.className = "menu-item-checkbox"; 
				
			} else {
				input = this._createRadioElement('leaflet-base-layers', checked);
				
				label.className = "menu-item-radio"; 
			}

			input.layerId = L.Util.stamp(obj.layer);

			L.DomEvent.on(input, 'click', this._onInputClick, this);

			var name = document.createElement('span');
			name.innerHTML = ' ' + obj.name;

			label.appendChild(input);
			label.appendChild(name);

			if (obj.overlay) {
				container = this._overlaysList;
			} else {
				container = this._baseLayersList;
			}
						
			var groupContainer = this._domGroups[obj.group.id];

			if (!groupContainer) {
				
				groupContainer = document.createElement('div');
				groupContainer.id = 'leaflet-control-accordion-layers-' + obj.group.id;
				
				// verify if group is expanded
				var s_expanded = obj.group.expanded ? ' checked = "true" ' : '';
				
				// verify if type is exclusive
				var s_type_exclusive = this.options.exclusive ? ' type="radio" ' : ' type="checkbox" ';
				
				inputElement = '<input id="ac' + obj.group.id + '" name="accordion-1" class="menu" ' + s_expanded + s_type_exclusive + '/>';
				inputLabel   = '<label for="ac' + obj.group.id + '">' + obj.group.name + '</label>';
				
				article = document.createElement('article');
				article.className = 'ac-large';
				article.appendChild( label );
				
				groupContainer.innerHTML = inputElement + inputLabel;
				groupContainer.appendChild( article );
				container.appendChild(groupContainer); 

				this._domGroups[obj.group.id] = groupContainer;
			} else {
				groupContainer.lastElementChild.appendChild( label );
			}	

			return label;
		},

		_onInputClick : function () {
			var i,
			input,
			obj,
			inputs = this._form.getElementsByTagName('input'),
			inputsLen = inputs.length;

			this._handlingClick = true;

			for (i = 0; i < inputsLen; i++) {
				input = inputs[i];
				obj = this._layers[input.layerId];
				
			    if ( !obj ) { continue; }

				if (input.checked && !this._map.hasLayer(obj.layer)) {
					this._map.addLayer(obj.layer);

				} else if (!input.checked && this._map.hasLayer(obj.layer)) {
					this._map.removeLayer(obj.layer);
				}
			}

			this._handlingClick = false;
		},

		_expand : function () {
			L.DomUtil.addClass(this._container, 'leaflet-control-layers-expanded');
		},

		_collapse : function () {
			this._container.className = this._container.className.replace(' leaflet-control-layers-expanded', '');
		}
	});

L.Control.styledLayerControl = function (baseLayers, overlays, options) {
	return new L.Control.StyledLayerControl(baseLayers, overlays, options);
};
