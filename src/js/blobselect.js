/**
*
* blob-select
* Version: 1.1.2
*
* Copyright © 2017 Blobfolio, LLC <https://blobfolio.com>
* This work is free. You can redistribute it and/or modify
* it under the terms of the Do What The Fuck You Want To
* Public License, Version 2.
*
* use:
*	<select data-blobselect='{...}'>
*	<select data-blobselect-order-type="string" ...>
*	document.getElementById('my-select').blobSelect.init({...})
*
*	select fields with data-blobselect* attributes are auto-initialized on load
*	select fields can be manually initialized with:
*		document.getElementById('myselect').blobSelect.init()
*
* options:
*	orderType (string, numeric, null)
*		(string)
*		options will be resorted based on their values
*		default: null (i.e. no sort)
*	order (ASC, DESC)
*		(string)
*		options will be resorted up or down
*		default: ASC
*	placeholder (string)
*		mimics an input's placeholder attribute; this text is displayed when the
*		selection has no label
*		default: ---
*	placeholderOption (string)
*		this text is used when an option has no label
*		default: ---
*	search (bool)
*		a contentEditable field is placed at the top of the menu
*		to allow users to filter results
*		default: false
*	watch (int)
*		have each blobSelect instance watch itself for unannounced changes
*		(that is, no proper event was fired) every WATCH milliseconds
*		this adds overhead, but can be necessary with e.g. AngularJS
*		default: false
*	debug (bool)
*		dump lots of event info to the console log
*		default: false
*
**/
(function(){

	//---------------------------------------------------------------------
	// Helpers
	//---------------------------------------------------------------------

	//make sure the browser supports what is needed
	if(
		!('classList' in document.documentElement) ||
		!('createRange' in document) ||
		!('querySelector' in document && 'querySelectorAll' in document) ||
		!('JSON' in window && 'parse' in JSON && 'stringify' in JSON)
	) {
		console.warn('blobSelect[' + new Date().toISOString().slice(0, 19).replace('T', ' ') + '] aborted; browser missing feature support');
		return;
	}

	//also, a neat polyfill for .matches()
	if(!Element.prototype.matches){
		Element.prototype.matches =
			Element.prototype.matchesSelector ||
			Element.prototype.mozMatchesSelector ||
			Element.prototype.msMatchesSelector ||
			Element.prototype.oMatchesSelector ||
			Element.prototype.webkitMatchesSelector ||
			function(s) {
				var matches = (this.document || this.ownerDocument).querySelectorAll(s),
					i = matches.length;
				while (--i >= 0 && matches.item(i) !== this) {}
				return i > -1;
			};
	}

	var selectors = [':disabled',':required',':valid',':invalid'];

	//-------------------------------------------------
	//JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
	//
	// @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
	// @see http://github.com/garycourt/murmurhash-js
	// @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
	// @see http://sites.google.com/site/murmurhash/
	//
	// @param {string} key ASCII only
	// @param {number} seed Positive integer only
	// @return {number} 32-bit positive integer hash

	function _hash(key, seed) {
		var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;

		if(typeof key === 'object')
			key = JSON.stringify(key);

		remainder = key.length & 3; // key.length % 4
		bytes = key.length - remainder;
		h1 = seed;
		c1 = 0xcc9e2d51;
		c2 = 0x1b873593;
		i = 0;

		while (i < bytes) {
			k1 =
			  ((key.charCodeAt(i) & 0xff)) |
			  ((key.charCodeAt(++i) & 0xff) << 8) |
			  ((key.charCodeAt(++i) & 0xff) << 16) |
			  ((key.charCodeAt(++i) & 0xff) << 24);
			++i;

			k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
			k1 = (k1 << 15) | (k1 >>> 17);
			k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

			h1 ^= k1;
			h1 = (h1 << 13) | (h1 >>> 19);
			h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
			h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
		}

		k1 = 0;

		switch (remainder) {
			case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16; break;
			case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8; break;
			case 1: k1 ^= (key.charCodeAt(i) & 0xff);

			k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
			k1 = (k1 << 15) | (k1 >>> 17);
			k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
			h1 ^= k1;
		}

		h1 ^= key.length;

		h1 ^= h1 >>> 16;
		h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
		h1 ^= h1 >>> 13;
		h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
		h1 ^= h1 >>> 16;

		return h1 >>> 0;
	}

	//-------------------------------------------------
	// jQuery-like nice selector
	//
	// stole this from Lea Verou :)
	//
	// @param expression
	// @param container
	// @return results
	var $ = function(expr, con){
		if (!expr) return null;
		return typeof expr === 'string'? (con || document).querySelector(expr) : expr;
	};

	//and for arrays
	var $$ = function(expr, con){
		return Array.prototype.slice.call((con || document).querySelectorAll(expr));
	};

	//-------------------------------------------------
	// jQuery-like .extend()
	//
	// @param defaults
	// @param overrides
	// @return extended
	var _extend = function(defaults, overrides){
		var extended = {},
			keys,
			keysLength;

		// Sanitize defaults.
		if (typeof defaults !== 'object') {
			defaults = {};
		}
		if (typeof overrides !== 'object') {
			overrides = {};
		}

		// Loop defaults.
		keys = Object.keys(defaults);
		keysLength = keys.length;

		for (i=0; i<keysLength; i++) {
			extended[keys[i]] = defaults[keys[i]];
		}

		// Loop overrides.
		keys = Object.keys(overrides);
		keysLength = keys.length;

		for (i=0; i<keysLength; i++) {
			if (
				(typeof extended[keys[i]] !== 'undefined') &&
				(typeof overrides[keys[i]] !== 'undefined') &&
				(overrides[keys[i]] !== null)
			) {
				extended[keys[i]] = overrides[keys[i]];
			}
		}

		return extended;
	};

	//-------------------------------------------------
	// jQuery-like .closest()
	//
	// @param el
	// @param selector
	// @return self or closest matching parent
	var _closest = function (el, selector){
		try {
			//try self
			if(el.matches(selector))
				return el;

			//up the chain
			while(el.parentNode && 'matches' in el.parentNode){
				el = el.parentNode;
				if(el.matches(selector))
					return el;
			}
		} catch(Ex){}

		return null;
	};

	//-------------------------------------------------
	// forEach() wrapper that can loop through
	// [object Object]s too
	//
	// @param collection
	// @param callback (value, key, collection)
	// @return n/a
	var _forEach = function(collection, callback){
		if(Object.prototype.toString.call(collection) === '[object Object]'){
			for (var key in collection){
				if (Object.prototype.hasOwnProperty.call(collection, key))
					callback(collection[key], key, collection);
			}
		}
		else {
			for (var akey = 0, len = collection.length; akey < len; akey++)
				callback(collection[akey], akey, collection);
		}
	};

	//-------------------------------------------------
	// Sanitize regexp characters
	//
	// also stole this from Lea Verou!
	//
	// @param str
	// @return str
	var _sanitizeRegexp = function(s){ return s.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&"); };

	//-------------------------------------------------
	// Sanitize Whitespace
	//
	// @param str
	// @param trim
	// @return str
	var _sanitizeWhitespace = function(str, trim){
		str = str.replace(/\s{1,}/mg, ' ');
		return str.trim();
	};

	//-------------------------------------------------
	// JSON.parse() wrapper that won't explode if
	// passed non-JSON data
	//
	// @param string
	// @return JSON or {}
	var _parseJSON = function(str){
		if(_isObject(str))
			return str;

		try {
			var j = JSON.parse(str);
			return j;
		}
		catch (e){
			return {};
		}
	};

	//-------------------------------------------------
	// move the cursor to the end of a contenteditable
	// field
	//
	// @param el
	// @return n/a
	var _cursorToEnd = function(el){
		//move the cursor to the end
		var searchRange,
			searchSelection;

		searchRange = document.createRange();
		searchRange.selectNodeContents(el);
		searchRange.collapse(false);
		searchSelection = window.getSelection();
		searchSelection.removeAllRanges();
		searchSelection.addRange(searchRange);
		return;
	};

	//-------------------------------------------------
	// printable key codes
	//
	// @param keyCode
	// @return true/false
	var _isPrintable = function(key){
		return (
		(key > 47 && key < 58)   ||	// number keys   || // spacebar & return key(s) (if you want to allow carriage returns)
		(key > 64 && key < 91)   ||	// letter keys
		(key > 95 && key < 112)  ||	// numpad keys
		(key > 185 && key < 193) ||	// ;=,-./` (in order)
		(key > 218 && key < 223));	// [\]' (in order)
	};

	//-------------------------------------------------
	// jQuery-like .remove()
	//
	// @param element(s)
	// @return n/a
	var _removeElement = function(elements){
		if(!Array.isArray(elements) && elements instanceof HTMLElement)
			elements = [elements];

		//prefer jQuery's element removal handling as it does a
		//better job of clearing bound events across browsers
		if(typeof jQuery !== 'undefined'){
			_forEach(elements, function(element){
				jQuery(element).remove();
				if(element in _bound)
					delete _bound[element];
			});
			return;
		}

		//otherwise the vanilla way!
		_forEach(elements, function(element){
			//clean up listeners
			if(element in _bound){
				_forEach(_bound[element], function(event, callbacks){
					_forEach(callbacks, function(callback){
						//this doesn't work in all browsers
						try { element.removeEventListener(event, callback, false); }
						catch (ex) { this.debug('failed to unregister events when removing object'); }
					});
				});
				delete _bound[element];
			}

			element.parentNode.removeChild(element);
		});
	};

	//-------------------------------------------------
	// bind wrapper
	//
	// @param element
	// @param event
	// @param callback
	// @return true/false
	var _bound = {};
	var _bind = function(element, event, callback){
		if(!element || typeof callback !== 'function' || !event)
			return false;

		if(!(element in _bound))
			_bound[element] = {};

		if(!(event in _bound[element]))
			_bound[element][event] = [];

		_bound[element][event].push(callback);

		element.addEventListener(event, callback, false);
	};

	//-------------------------------------------------
	// is object
	//
	// @param var
	// @return true/false
	var _isObject = function(variable){
		return (variable !== null && typeof variable === 'object' && !Array.isArray(variable));
	};

	//-------------------------------------------------
	// Default Settings

	var defaultSettings = {
		"orderType" : "",				//sort options by something?
		"order" : "ASC",				//sort direction
		"placeholder" : "---",			//text to use if selection has no label
		"placeholderOption" : "---",	//text to use if option has no label
		"search" : false,				//create an input field to filter results
		"watch" : 0,					//watch for changes that don't come from change event
		"debug" : false					//enable debugging
	};


	//---------------------------------------------------------------------
	// Plugin
	//---------------------------------------------------------------------

	//-------------------------------------------------
	// Constructor

	var blobSelect = function(element){
		this.element = element;
	};

	//-------------------------------------------------
	// The Guts

	blobSelect.prototype = {
		_ : this,
		container : null,		//.blobselect
		selections : null,		//.blobselect-selections
		button : null,			//.blobselect-button
		items : null,			//.blobselect-items
		search : null,			//.blobselect-item-search
		searchValue : null,		//the last search value
		hash : null,			//a hash of option properties we care about
		settings : {},			//plugin settings
		watch : null,			//setInterval
		debounceQueue : {},		//debounced functions
		updateLock : false,		//don't respond to our own updates



		//-------------------------------------------------
		// Debug
		//
		// @param log
		// @return n/a
		debug: function(msg){
			if(!this.settings.debug)
				return false;

			console.log('blobSelect[' + new Date().toISOString().slice(0, 19).replace('T', ' ') + '] ' + msg);
			return true;
		},

		//-------------------------------------------------
		// Initialized
		//
		// @param n/a
		// @return true/false

		initialized: function(){
			return (this.container instanceof HTMLDivElement);
		},

		//-------------------------------------------------
		// Init
		//
		// @param settings args (optional)
		// @return true/false

		init: function(args){
			//already initialized
			if(this.initialized())
				return this.debug('already initialized; aborting');

			//sort out user settings
			if(!args){
				//maybe a JSON string?
				args = this.element.dataset.blobselect || false;
				if(!args){
					//maybe individual settings?
					args = {
						"orderType" : this.element.dataset.blobselectOrderType || null,
						"order" : this.element.dataset.blobselectOrder || null,
						"placeholder" : this.element.dataset.blobselectPlaceholder || null,
						"placeholderOption" : this.element.dataset.blobselectPlaceholderOption || null,
						"search" : this.element.dataset.blobselectSearch || null,
						"watch" : this.element.dataset.blobselectWatch || null,
						"debug" : this.element.dataset.blobselectDebug || null
					};
				}
			}
			this.saveSettings(args);

			//build our wrapper
			this.container = document.createElement('div');
				this.container.classList.add('blobselect');
				if(this.element.multiple)
					this.container.classList.add('is-multiple');
				this.container.tabIndex = this.element.tabIndex || 0;
				this.element.parentNode.insertBefore(this.container, this.element);

			this.debug('built container');

			//add selections wrapper
			this.selections = document.createElement('div');
				this.selections.classList.add('blobselect-selections');
				this.container.appendChild(this.selections);

			//move the select inside the container
			this.container.appendChild(this.element);

			//add a button
			this.button = document.createElement('div');
				this.button.classList.add('blobselect-button');
				this.container.appendChild(this.button);

			//our items wrapper
			this.items = document.createElement('div');
				this.items.classList.add('blobselect-items');
				this.container.appendChild(this.items);

			//search field
			this.searchField();

			//update selections
			this.updateBuild();

			//watch for changes that don't fire events
			var me = this;
			if(this.settings.watch){
				this.debug('watching for changes every ' + (this.settings.watch/1000) + ' seconds');
				this.watch = setInterval(function(){
					me.updateBuild(false);
				}, this.settings.watch);
			}

			//lastly, bind some events
			_bind(this.element, 'change', function(){
				if(!me.updateLock){
					me.debug('element change event fired');
					me.updateBuild(false);
				}
			});

			//outside click
			_bind($('html'), 'click', function(e){
				me.debug('click outside');
				if(me.isOpen()){
					//ignore this or other blobselect elements
					if(_closest(e.target, '.blobselect') !== null)
						return true;
					else
						me.close();
				}
			});

			//clicks and keypresses
			_bind(this.container, 'click', function(e){ return me.containerClick(e); });
			_bind(this.container, 'keyup', function(e){ return me.containerKey(e); });

			return true;
		},

		//-------------------------------------------------
		// Destroy
		//
		// this will try to restore the regular select
		//
		// @param n/a
		// @return true
		destroy: function(){
			//already dead?
			if(!this.initialized())
				return this.debug('not initialized; aborting');

			//clear the watch interval
			if(this.watch)
				clearInterval(this.watch);

			//remove the search field
			if(this.search)
				_removeElement(this.search);

			//items
			_removeElement($$('.blobselect-item-group, .blobselect-item', this.items));

			//move the select
			this.container.parentNode.insertBefore(this.element, this.container);

			//remove the container
			_removeElement(this.container);

			//reset variables
			this.container = null;
			this.selections = null;
			this.button = null;
			this.items = null;
			this.search = null;
			this.searchValue = null;
			this.hash = null;
			this.settings = {};
			this.watch = null;
			this.debounceQueue = {};
			this.updateLock = false;

			this.debug('natural <select> restored');

			//done!
			return true;
		},

		//-------------------------------------------------
		// Set Settings
		//
		// @param settings
		// @return n/a

		saveSettings: function(userSettings){
			userSettings = _parseJSON(userSettings);
			if(!_isObject(userSettings))
				userSettings = {};

			this.settings = _extend(defaultSettings, userSettings);

			//sanitize values
			if(typeof this.settings.search !== 'boolean')
				this.settings.search = (typeof this.settings.search === 'string' && this.settings.search.toLowerCase() === 'true') || (typeof this.settings.search === 'number' && this.settings.search);
			this.settings.order = typeof this.settings.order === 'string' && ['ASC','DESC'].indexOf(this.settings.order.toUpperCase()) !== -1 ? this.settings.order.toUpperCase() : false;
			this.settings.orderType = typeof this.settings.orderType === 'string' && ['string','numeric'].indexOf(this.settings.orderType.toLowerCase()) !== -1 ? this.settings.orderType.toLowerCase() : false;
			this.settings.placeholder = _sanitizeWhitespace(this.settings.placeholder);
			this.settings.placeholderOption = _sanitizeWhitespace(this.settings.placeholderOption);
			this.settings.watch = parseInt(this.settings.watch, 10) || 0;
			if(this.settings.watch < 0)
				this.settings.watch = 0;
			if(typeof this.settings.debug !== 'boolean')
				this.settings.debug = (typeof this.settings.debug === 'string' && this.settings.debug.toLowerCase() === 'true') || (typeof this.settings.debug === 'number' && this.settings.debug);

			this.debug('using settings: ' + JSON.stringify(this.settings));

			//might need to add/remove search field
			this.searchField();
		},

		//-------------------------------------------------
		// Search Field

		searchField: function(){
			if(!this.initialized())
				return false;

			if(!this.settings.search && this.search !== null){
				_removeElement(this.search);
				this.search = null;
				this.debug('search field removed');
			}
			else if(this.settings.search && this.search === null) {
				this.search = document.createElement('div');
					this.search.classList.add('blobselect-item-search');
					this.search.setAttribute('type','text');
					this.search.setAttribute('contentEditable','true');
					this.search.tabIndex = 0;
					if(this.items.firstChild)
						this.items.insertBefore(this.search, this.items.firstChild);
					else
						this.items.appendChild(this.search);

				this.debug('search field built');
			}

			return true;
		},

		//-------------------------------------------------
		// Debounce Scheduler
		//
		// @param key
		// @param function
		// @param timeout
		// @return true
		debounce: function(key, func, timeout){
			if(timeout === undefined || timeout === null)
				timeout = 250;

			if(this.debounceQueue[key] !== undefined && this.debounceQueue[key] !== null)
				clearTimeout(this.debounceQueue[key]);

			this.debounceQueue[key] = setTimeout(func(), timeout);
			return true;
		},

		//-------------------------------------------------
		// Update Build
		//
		// this rebuilds selection and item entries, and
		// generates the correct hash

		updateBuild: function(force){

			var me = this;

			return this.debounce(
				'updateBuild',
				function(){
					var h = me.getHash(),
						disabled = me.element.disabled;
					me.debug('checking for updates');

					//while we're here, update the blob-select
					//container's disabled status to match the
					//element's
					if(disabled)
						me.container.classList.add('is-disabled');
					else
						me.container.classList.remove('is-disabled');

					//check fancy CSS selectors
					var keys = Object.keys(selectors),
						keysLength = keys.length;

					for (i=0; i<keysLength; i++) {
						var hasIt = me.container.hasAttribute(selectors[keys[i]]),
							matches = me.element.matches(selectors[keys[i]]);

						if(!hasIt && matches){
							me.container.setAttribute(selectors[keys[i]], true);
							me.container[selectors[keys[i]]] = true;
						}
						else if(hasIt && !matches){
							me.container.removeAttribute(selectors[keys[i]]);
							me.container[selectors[keys[i]]] = false;
						}
					}

					//double-check options
					if(force || h !== me.hash){
						me.debug('updates found');
						me.hash = h;
						me.updateSelections();
						me.updateItems();
						me.searchValue = null;
						me.filterItems();
					}
				},
				100);
		},

		//-------------------------------------------------
		// Build Option Hash

		getHash: function(){
			if(!this.initialized())
				return false;

			var h = [],
				attr = {},
				me = this;

			//first, let's do the select's state attributes
			var keys = Object.keys(selectors),
				keysLength = keys.length;

			for (i=0; i<keysLength; i++) {
				attr[selectors[keys[i]]] = me.element.matches(selectors[keys[i]]);
			}
			h.push(attr);

			//and options
			var options = $$('option, optgroup', this.element);
			keys = Object.keys(options);
			keysLength = keys.length;
			for (i=0; i<keysLength; i++) {
				h.push({
					value : options[keys[i]].value,
					label : options[keys[i]].textContent,
					selected : options[keys[i]].selected,
					disabled : options[keys[i]].disabled
				});
			}

			return _hash(h);
		},

		//-------------------------------------------------
		// Is Placeholder?

		is_placeholder: function(o){
			if(o.tagName !== 'OPTION')
				return false;

			var label = _sanitizeWhitespace(o.textContent),
				override = parseInt(o.dataset.placeholder, 10) || 0;

			return (!label.length || override === 1 || label.toLowerCase() === this.settings.placeholderOption.toLowerCase());
		},

		//-------------------------------------------------
		// Update Items

		updateItems: function(){
			if(!this.initialized())
				return false;

			var items = [],
				me = this,
				optgroups = $$('optgroup', this.element),
				keys,
				keysLength,
				keys2,
				keys2Length,
				options,
				tmp;

			//we want to sort optgroup items within themselves
			keys = Object.keys(optgroups);
			keysLength = keys.length;
			if(keysLength){
				for (i=0; i<keysLength; i++) {
					items.push(optgroups[keys[i]]);

					tmp = [];
					options = $$('option', optgroups[keys[i]]);
					keys2 = Object.keys(options);
					keys2Length = keys2.length;
					for (j=0; j<keys2Length; j++) {
						tmp.push(options[keys2[j]]);
					}

					tmp = me.sortItems(tmp);
					keys2 = Object.keys(tmp);
					keys2Length = keys2.length;
					for (j=0; j<keys2Length; j++) {
						items.push(tmp[keys2[j]]);
					}
				}

				//now do the same thing for any un-grouped options
				tmp = [];
				keys = Object.keys(this.element.children);
				keysLength = keys.length;
				for (i=0; i<keysLength; i++) {
					if(this.element.children[keys[i]].tagName === 'OPTION'){
						//bubble placeholders to top
						if(me.is_placeholder(this.element.children[keys[i]]))
							items.unshift(this.element.children[keys[i]]);
						else
							tmp.push(this.element.children[keys[i]]);

					}
				}
				tmp = this.sortItems(tmp);

				keys = Object.keys(tmp);
				keysLength = keys.length;
				for (i=0; i<keysLength; i++) {
					items.push(tmp[keys[i]]);
				}
			}
			//just options
			else {
				options = $$('option', this.element);
				keys = Object.keys(options);
				keysLength = keys.length;
				for (i=0; i<keysLength; i++) {
					items.push(options[keys[i]]);
				}

				items = this.sortItems(items);
			}

			//clear any old items
			_removeElement($$('.blobselect-item-group, .blobselect-item', this.items));

			var tabindex = 1;
			keys = Object.keys(items);
			keysLength = keys.length;
			for (i=0; i<keysLength; i++) {
				var el = document.createElement('div');

				//an option group
				if(items[keys[i]].tagName === 'OPTGROUP'){
					el.classList.add('blobselect-item-group');
					if(items[keys[i]].disabled)
						el.classList.add('is-disabled');
					el.textContent = _sanitizeWhitespace(items[keys[i]].label);
				}
				//an option
				else {
					tabindex++;
					el.tabIndex = tabindex;

					var label = _sanitizeWhitespace(items[keys[i]].textContent);

					el.classList.add('blobselect-item');

					if(items[keys[i]].selected)
						el.classList.add('is-active');

					if(items[keys[i]].parentNode.tagName === 'OPTGROUP')
						el.classList.add('has-group');

					if(items[keys[i]].disabled || (items[keys[i]].parentNode.tagName === 'OPTGROUP') && items[keys[i]].parentNode.disabled)
						el.classList.add('is-disabled');

					el.setAttribute('data-value', items[keys[i]].value);
					el.setAttribute('data-label', label);

					if(me.is_placeholder(items[keys[i]])){
						el.classList.add('is-placeholder');
						el.textContent = me.settings.placeholderOption;
					}
					else
						el.textContent = label;

					/* jshint ignore:start */
					_bind(el, 'focus', function(e){
						//since true focus is lost on events caught by wrappers,
						//we want to store this as an attribute
						me.items.setAttribute('data-focused', $$('.blobselect-item', me.items).indexOf(el));
						el.classList.add('is-focused');
					});

					_bind(el, 'blur', function(e){
						el.classList.remove('is-focused');
					});
					/* jshint ignore:end */
				}

				me.items.appendChild(el);
			}

			this.debug('dropdown items rebuilt');
		},

		//-------------------------------------------------
		// Active Item
		//
		// return the focused/enabled item, or first
		// enabled item

		getActiveItem: function(){
			var choice,
				me = this,
				items = $$('.blobselect-item', this.items),
				focused = parseInt(this.items.dataset.focused, 10) || -1;

			//opt for focused first
			if(focused !== -1){
				choice = items[focused];
			}

			//otherwise find the first enabled child
			if(!choice || choice.classList.contains('is-disabled') || choice.classList.contains('is-not-match')){
				choice = null;
				var keys = Object.keys(items),
					keysLength = keys.length;
				//locate either a focused/enabled item, or the first enabled item
				for (i=0; i<keysLength; i++) {
					if(!items[keys[i]].classList.contains('is-not-match') && !items[keys[i]].classList.contains('is-disabled')){
						if(!choice){
							me.debug('first item "' + items[keys[i]].dataset.value + '"');
							choice = items[keys[i]];
						}
					}
				}
			}

			return choice;
		},

		//-------------------------------------------------
		// Update Selections

		updateSelections: function(){
			if(!this.initialized())
				return false;

			var s = [],
				me = this,
				options = $$('option', this.element),
				keys = Object.keys(options),
				keysLength = keys.length;

			for (i=0; i<keysLength; i++) {
				if(options[keys[i]].selected){
					s.push(options[keys[i]]);
				}
			}

			s = this.sortItems(s);

			//clear any old selections
			while(this.selections.firstChild) {
				_removeElement(this.selections.firstChild);
			}

			keys = Object.keys(s);
			keysLength = keys.length;
			for (i=0; i<keysLength; i++) {
				var el = document.createElement('div'),
					label = _sanitizeWhitespace(s[keys[i]].textContent);
					el.classList.add('blobselect-selection');
					el.setAttribute('data-value', s[keys[i]].value);
					el.setAttribute('data-label', label);

					if(me.is_placeholder(s[keys[i]])){
						el.classList.add('is-placeholder');
						el.textContent = me.settings.placeholder;
					}
					else {
						el.textContent = label;
					}

				//and add it
				me.selections.appendChild(el);
			}

			this.debug('selections rebuilt');
		},

		//-------------------------------------------------
		// Container Click Handler

		containerClick: function(e){
			e.stopPropagation();

			//don't do anything if disabled
			if(this.container.classList.contains('is-disabled')){
				this.debug('click ignored; field is disabled');
				if(this.isOpen())
					return this.close();
				else
					return;
			}

			this.debug('clicked');

			//a (multi) selection
			if(e.target.classList.contains('blobselect-selection') && this.element.multiple){
				return this.unselect(e.target);
			}

			//the real select
			else if(e.target === this.element) {
				return;
			}

			//search field
			else if(e.target.classList.contains('blobselect-item-search')){
				this.search.setAttribute('contentEditable','true');
				return;
			}

			//an item
			else if(e.target.classList.contains('blobselect-item')){
				if(!e.target.classList.contains('is-disabled')){
					this.select(e.target);
				}
				return;
			}

			//toggle container state
			if(!this.isOpen())
				return this.open();
			else
				return this.close();
		},

		//-------------------------------------------------
		// Container Key Handler

		containerKey: function(e){
			var key = e.keyCode,
				map = {
					8: "backspace",
					9: "tab",
					13: "enter",
					27: "escape",
					32: "space",
					37: "left",
					38: "up",
					39: "right",
					40: "down",

				},
				keyMapped = map[key] || 'other',
				keyPrintable = _isPrintable(key);



			//if the menu is not open...
			if(!this.isOpen()){
				//open the menu on just about any key
				if(['tab','backspace'].indexOf(keyMapped) === -1){
					e.stopPropagation();

					//add the key to the search field?
					if(this.settings.search && keyPrintable){
						this.search.textContent = String.fromCharCode(key).toLowerCase();
						this.searchValue = null;
						this.filterItems();
					}

					return this.open();
				}
				return;
			}

			//escape
			else if(keyMapped === 'escape'){
				e.stopPropagation();
				return this.close();
			}

			//enter on current item
			else if(keyMapped === 'enter'){
				e.stopPropagation();
				e.preventDefault();

				//update search?
				if(this.search)
					this.search.innerHTML = _sanitizeWhitespace(this.search.textContent);

				//select the selection
				var choice = this.getActiveItem();
				if(choice)
					return this.select(choice);
				else
					return this.close();
			}

			//navigation?
			else if(['tab','up','down','left','right'].indexOf(keyMapped) !== -1){
				e.stopPropagation();
				if(e.target.classList.contains('blobselect-item-search')){
					//we only want to exit the search field on these keys
					if(['tab','up','down'].indexOf(keyMapped) !== -1)
						return this.traverseItems('current');

					return;
				}

				var direction = ['tab','down','right'].indexOf(keyMapped) !== -1 ? 'next' : 'back';
				return this.traverseItems(direction);
			}

			//search field
			else if(e.target.classList.contains('blobselect-item-search')){
				e.stopPropagation();

				//filter items?
				if(_sanitizeWhitespace(this.search.textContent).toLowerCase() !== this.searchValue){
					this.searchValue = _sanitizeWhitespace(this.search.textContent).toLowerCase();
					return this.filterItems();
				}

				return;
			}
		},

		//-------------------------------------------------
		// Traverse Items

		traverseItems: function(direction){
			var active = this.getActiveItem(),
				items = $$('.blobselect-item:not(.is-disabled):not(.is-not-match)', this.items),
				activeIndex = items.indexOf(active),
				choice = null;

			//bad active somehow?
			if(activeIndex === -1){
				if(items.length)
					activeIndex = 0;
				else
					return;
			}

			//we just want to move to the current
			if(direction === 'current')
				choice = items[activeIndex];

			//back
			else if(direction === 'back')
				choice = activeIndex > 0 ? items[activeIndex - 1] : items[0];

			//next
			else
				choice = activeIndex < items.length - 1 ? items[activeIndex + 1] : items[items.length - 1];

			return choice.focus();
		},

		//-------------------------------------------------
		// Open

		isOpen: function(){
			return (this.container.classList.contains('is-open') || this.container.classList.contains('is-opening'));
		},

		open: function(){
			var me = this;

			//we can ignore this if already open or not initialized
			if(!this.initialized() || this.isOpen())
				return true;

			//close any other blobselects
			var selects = $$('.blobselect.is-open select'),
				keys = Object.keys(selects),
				keysLength = keys.length;
			for (i=0; i<keysLength; i++) {
				selects[keys[i]].blobSelect.close();
			}

			this.items.setAttribute('data-focused', -1);

			this.container.classList.add('is-opening');
			setTimeout(function(){
				me.container.classList.add('is-open');
				me.container.classList.remove('is-opening');
			}, 50);

			if(me.settings.search){
				me.search.setAttribute('contentEditable','true');

				//setTimeout(function(){
				me.search.focus();
				_cursorToEnd(me.search);
			}

			this.debug('dropdown opened');
		},

		//-------------------------------------------------
		// Close

		close: function(){
			//we can ignore this if already open or not initialized
			if(!this.initialized() || !this.isOpen())
				return true;

			this.container.classList.remove('is-open', 'is-opening');
			this.items.setAttribute('data-focused', -1);

			this.debug('dropdown closed');
		},

		//-------------------------------------------------
		// Trigger Change
		//
		// this triggers the input change event in case
		// anybody else is listening
		triggerChange: function(){
			this.updateLock = true;
			var event = document.createEvent('UIEvents');
			event.initUIEvent("change", true, true, window, 1);
			this.element.dispatchEvent(event);
			this.updateLock = false;
		},

		//-------------------------------------------------
		// Select

		select: function(o){
			if(!this.initialized() || !(o instanceof HTMLDivElement) || !o.classList.contains('blobselect-item'))
				return this.close();

			var value = o.dataset.value || '',
				options = this.getOptionByValue(value),
				me = this,
				keys = Object.keys(options),
				keysLength = keys.length;


			if(keysLength){
				if(this.element.multiple){
					for (i=0; i<keysLength; i++) {
						if(options[keys[i]].selected){
							options[keys[i]].selected = 0;
							me.debug('unselected: "' + options[keys[i]].value + '"');
						}
						else {
							options[keys[i]].selected = 1;
							me.debug('selected: "' + options[keys[i]].value + '"');
						}
					}
				}
				else{
					this.element.selectedIndex = options[0].index;
					this.debug('selected: "' + options[0].value + '"');
				}
			}
			else if(!this.element.multiple){
				this.element.selectedIndex = this.element.firstChild.index;
				this.debug('selected: "' + this.element.firstChild.value + '"');
			}

			this.close();
			this.updateBuild();
			this.triggerChange();
		},

		//-------------------------------------------------
		// Unselect

		unselect: function(o){
			if(!this.initialized() || !this.element.multiple || !(o instanceof HTMLDivElement) || !(o.classList.contains('blobselect-selection') || o.classList.contains('blobselect-item')))
				return this.close();

			var value = o.dataset.value || '',
				options = this.getOptionByValue(value, true),
				me = this,
				keys = Object.keys(options),
				keysLength = keys.length;

			if(keysLength){
				for (i=0; i<keysLength; i++) {
					options[keys[i]].selected = 0;
					me.debug('unselected: "' + options[keys[i]].value + '"');
				}
			}

			this.close();
			this.updateBuild();
			this.triggerChange();
		},

		//-------------------------------------------------
		// Get Option by Value

		getOptionByValue: function(value, allowDisabled){
			if(!this.initialized()) {
				return false;
			}

			var me = this,
				found = [],
				options = $$('option', this.element),
				keys = Object.keys(options),
				keysLength = keys.length;

			for (i=0; i<keysLength; i++) {
				if(options[keys[i]].value === value && (allowDisabled || !options[keys[i]].disabled)) {
					found.push(options[keys[i]]);
				}
			}

			return found;
		},

		//-------------------------------------------------
		// Filter Items by Search

		filterItems: function(){
			if(!this.initialized() || !this.settings.search) {
				return false;
			}

			var me = this;

			this.debounce(
				'filterItems',
				function(){
					var needle = _sanitizeRegexp(_sanitizeWhitespace(me.search.textContent)),
						items = $$('.blobselect-item', me.items),
						matches = 0,
						keys = Object.keys(items),
						keysLength = keys.length;

					//first pass, try matches
					if(needle.length){
						for (i=0; i<keysLength; i++) {
							var haystack = items[keys[i]].dataset.label,
								matchNew = !needle.length || RegExp(needle, 'i').test(haystack),
								matchOld = !items[keys[i]].classList.contains('is-not-match');

							//start fresh
							if(items[keys[i]].classList.contains('is-placeholder')) {
								haystack = me.settings.placeholderOption;
							}

							items[keys[i]].textContent = haystack;

							//matches now
							if(matchNew){
								items[keys[i]].classList.remove('is-not-match');
								items[keys[i]].classList.add('is-match');
								items[keys[i]].innerHTML = haystack.replace(RegExp(needle, "gi"), "<mark>$&</mark>");
								matches++;
							}
							//doesn't match now
							else if(!matchNew){
								items[keys[i]].classList.add('is-not-match');
								items[keys[i]].classList.remove('is-match');
							}
						}
					}

					//if there are no matches, treat it like a non-search
					if(!matches){
						for (i=0; i<keysLength; i++) {
							items[keys[i]].classList.remove('is-not-match');
							items[keys[i]].innerHTML = items[keys[i]].textContent;
						}
					}
					else {
						me.debug('items filtered by search term');
					}
				},
				100
			);
		},

		//---------------------------------------------
		// Sort Items

		sortItems: function(items){
			if(!this.initialized() || !this.settings.orderType || !this.settings.order || !Array.isArray(items) || !items.length) {
				return items;
			}

			var me = this;
			items.sort(function(a,b){
				var aText = a.dataset.label || _sanitizeWhitespace(a.textContent) || _sanitizeWhitespace(a.label),
					bText = b.dataset.label || _sanitizeWhitespace(b.textContent) || _sanitizeWhitespace(b.label);

				//treat placeholders as priority
				if(aText.toLowerCase() === me.settings.placeholderOption.toLowerCase()) {
					aText = me.settings.orderType === 'numeric' ? 0 : '';
				}
				if(bText.toLowerCase() === me.settings.placeholderOption.toLowerCase()) {
					bText = me.settings.orderType === 'numeric' ? 0 : '';
				}

				if(me.settings.orderType === 'numeric'){
					aText = Number(aText.replace(/[^\d\.]/g, '')) || 0;
					bText = Number(bText.replace(/[^\d\.]/g, '')) || 0;
				}

				if(aText === bText) {
					return 0;
				}
				else if(me.settings.order === 'ASC') {
					return aText < bText ? -1 : 1;
				}
				else {
					return aText > bText ? -1 : 1;
				}
			});

			return items;
		}
	};



	//---------------------------------------------------------------------
	// Extend DOM
	//---------------------------------------------------------------------

	Object.defineProperty(HTMLSelectElement.prototype, 'blobSelect', {
		//thanks to @guoguo12 for the weird IE fix!
		get: function getter () {
			Object.defineProperty(HTMLSelectElement.prototype, 'blobSelect', {
				get: undefined
			});
			Object.defineProperty(this, 'blobSelect', {
				value: new blobSelect(this)
			});
			Object.defineProperty(HTMLSelectElement.prototype, 'blobSelect', {
				get: getter
			});
			return this.blobSelect;
		},
		configurable: true
	});



	//---------------------------------------------------------------------
	// Auto Initialize
	//---------------------------------------------------------------------

	document.addEventListener('DOMContentLoaded', function(){
		var matches = $$('select[data-blobselect], select[data-blobselect-watch], select[data-blobselect-search], select[data-blobselect-placeholder], select[data-blobselect-placeholder-option], select[data-blobselect-order], select[data-blobselect-order-type], select[data-blobselect-debug]');
		_forEach(matches, function(select){
			select.blobSelect.init();
		});
	});

})();