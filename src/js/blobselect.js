/**
*
* blob-select
* Version: 2.0.1
* https://github.com/Blobfolio/blob-select
*
* Copyright © 2018 Blobfolio, LLC <https://blobfolio.com>
*
* This work is free. You can redistribute it and/or modify it under the
* terms of the Do What The Fuck You Want To Public License, Version 2.
*
* USE:
*	<select data-blobselect='{...}'>
*	<select data-blobselect-order-type="string" ...>
*	document.getElementById('my-select').blobSelect.init({...})
*
*	select fields with data-blobselect* attributes are auto-initialized on load
*	select fields can be manually initialized with:
*		document.getElementById('myselect').blobSelect.init()
*
* OPTIONS:
*	orderType (string, numeric, null)
*		(string)
*		Options will be resorted based on their values.
*		Default: null (i.e. no sort)
*	order (ASC, DESC)
*		(string)
*		Options will be resorted up or down.
*		Default: ASC
*	placeholder (string)
*		Mimics an input's placeholder attribute; this text is displayed
*		when the selection has no label.
*		Default: ---
*	placeholderOption (string)
*		This text is used when an option has no label (i.e. in the
*		dropdown).
*		Default: ---
*	search (bool)
*		A contentEditable field is placed at the top of the menu to
*		allow users to filter results.
*		Default: false
*	watch (int)
*		Each blobSelect instance will watch for unexpected DOM changes
*		every X milliseconds. This might be necessary when combining
*		blob-select with a Javascript framework that might manipulate
*		values *without* firing a change event.
*		Default: false
*
**/
(function(){

	// -----------------------------------------------------------------
	// Compatibility
	// -----------------------------------------------------------------

	// First things first, make sure we aren't trying to run code that
	// the browser can't handle.
	if(
		!('classList' in document.documentElement) ||
		!('createRange' in document) ||
		!('querySelector' in document && 'querySelectorAll' in document) ||
		!('JSON' in window && 'parse' in JSON && 'stringify' in JSON)
	) {
		console.warn('blobSelect[' + new Date().toISOString().slice(0, 19).replace('T', ' ') + '] aborted; browser missing feature support');
		return;
	}

	// A simple polyfill for .matches() support.
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

	// ----------------------------------------------------------------- end compatability



	// -----------------------------------------------------------------
	// Setup
	// -----------------------------------------------------------------

	// Runtime settings.
	var settings = {
		orderType: '',				// Sort <OPTION>: string, numeric
		order: 'ASC',				// Sort order.
		placeholder: '---',			// Selected Placeholder.
		placeholderOption: '---',	// Option placeholder.
		search: false,				// Enable search.
		watch: 0,					// Watch DOM manually.
	};

	// Flag names.
	var flags = {
		blobselectOrderType: 'blobselect-order-type',
		blobselectOrder: 'blobselect-order',
		blobselectPlaceholder: 'blobselect-placeholder',
		blobselectPlaceholderOption: 'blobselect-placeholder-option',
		blobselectSearch: 'blobselect-search',
		blobselectWatch: 'blobselect-watch',
	};

	/**
	 * Plugin Constructor
	 *
	 * @param DOMElement $el Element.
	 * @return void Nothing.
	 */
	var blobSelect = function(el) {
		this.$element = el;
	};

	// HTML clicks.
	var clickOutside = false;

	// ----------------------------------------------------------------- end setup



	// -----------------------------------------------------------------
	// Plugin!
	// -----------------------------------------------------------------

	blobSelect.prototype = {
		// State.
		_: this,				// Shorthand for $this.
		$element: null,			// The bound <SELECT> element.
		$lock: false,			// Activity lock.
		$me: {					// The instance.
			disabled: false,	// Instance disabled.
			multiple: false,	// Instance multiple.
			required: false,	// Instance required.
			state: 'closed',	// Instance state (closed, opening, open, closing).
		},
		$search: '',			// Search value.
		$settings: {},			// Runtime settings.
		$watch: 0,				// Watch interval.

		// Items (internal).
		$items: [],				// Computed items (all).
		$itemsHash: 0,			// Hash of above (for easy change detection).
		$selectedItems: [],		// Selected items.
		$selectedHash: 0,		// Hash of above.

		// Elements.
		container: null,		// Main wrapper: .blobselect
		button: null,			// Dropdown button: .blobselect-button
		items: null,			// Items wrapper: .blobselect-items
		search: null,			// Search wrapper: .blobselect-item-search
		selections: null,		// Selections wrapper: .blobselect-selections



		// -------------------------------------------------------------
		// Init/Destroy
		// -------------------------------------------------------------

		/**
		 * Does this appear to be initialized?
		 *
		 * @return bool True/false.
		 */
		isInitialized: function() {
			return (this.container instanceof HTMLDivElement);
		},

		/**
		 * Does this have an element?
		 *
		 * @return bool True/false.
		 */
		hasElement: function() {
			return (this.$element instanceof HTMLSelectElement);
		},

		/**
		 * Initialize
		 *
		 * @param mixed $args Runtime args.
		 * @return bool True/false.
		 */
		init: function(args) {
			// Already initialized?
			if (this.isInitialized()) {
				return false;
			}

			// Apply settings.
			args = this.parseSettings(args);
			this.saveSettings(args);

			// Build container.
			this.buildContainer();

			// Build internal data.
			this.buildData();
		},

		/**
		 * Destroy
		 *
		 * @return bool True/false.
		 */
		destroy: function(args) {
			if (!this.isInitialized()) {
				return false;
			}

			// Remove watch interval.
			if (this.$watch) {
				clearInterval(this.$watch);
			}

			// Remove the search field separately to help unbind its
			// listeners.
			if (this.search !== null) {
				_removeElement(this.search);
			}

			// Remove items individually for the same reason.
			_removeElement(_find(this.items, '.blobselect-item-group, .blobselect-item'));

			// Move the select.
			this.container.parentNode.insertBefore(this.$element, this.container);

			// Remove the container.
			_removeElement(this.container);

			// Reset the variables.
			this.container = null;
			this.button = null;
			this.items = null;
			this.search = null;
			this.selections = null;

			this.$items = [];
			this.$selectedItems = [];
			this.$itemsHash = 0;
			this.$selectedHash = 0;
		},

		/**
		 * Parse Settings
		 *
		 * Settings can come as direct objects and/or from element
		 * attributes. This merges the sources.
		 *
		 * @param mixed $args Runtime args.
		 * @return bool True/false.
		 */
		parseSettings: function(args) {
			if (!this.hasElement()) {
				return {};
			}

			// Settings might come in a number of ways, from a number of
			// places. The first step is to build an object containing
			// all of them. Then we can use the parseSettings function
			// to make sure they make sense.
			if ((typeof args === 'string') && args) {
				args = _parseJSON(args);
			}
			else if (!_isObject(args)) {
				args = {};
			}

			// Maybe JSON via attribute?
			if (this.$element.dataset.blobselect) {
				args = _parseJSON(this.$element.dataset.blobselect);
			}

			// Options can be specified individually too.
			var flagsKeys = Object.keys(flags);
			for (i=0; i<flagsKeys.length; i++) {
				if (this.$element.dataset[flagsKeys[i]]) {
					// Apply the setting.
					var settingsKey = flagsKeys[i].substr(10, 1).toLowerCase() + flagsKeys[i].substr(11);
					args[settingsKey] = this.$element.dataset[flagsKeys[i]];

					// Remove the attribute(s);
					this.$element.removeAttribute(flags[flagsKeys[i]]);
					this.$element.removeAttribute('data-' + flags[flagsKeys[i]]);
				}
			}

			// And done!
			return args;
		},

		/**
		 * Save Settings
		 *
		 * @param mixed $args Runtime args.
		 * @return bool True/false.
		 */
		saveSettings: function(args) {
			if (!this.hasElement()) {
				return false;
			}

			// The initial work.
			var parsed = _parseArgs(args, settings, true);

			// Examine individual settings closer.
			if (parsed.orderType) {
				parsed.orderType = parsed.orderType.toLowerCase();
				if (['string','numeric'].indexOf(parsed.orderType) === -1) {
					parsed.orderType = '';
				}
			}

			parsed.order = parsed.order.toUpperCase();
			if (['ASC','DESC'].indexOf(parsed.order) === -1) {
				parsed.order = 'ASC';
			}

			parsed.placeholder = _sanitizeWhitespace(parsed.placeholder);
			parsed.placeholderOption = _sanitizeWhitespace(parsed.placeholderOption);

			parsed.watch = parseInt(parsed.watch, 10) || 0;
			if (parsed.watch < 0) {
				parsed.watch = 0;
			}

			// Save it.
			this.$settings = parsed;

			// Clear the old watch task, if any.
			if (this.$watch) {
				clearInterval(this.$watch);
			}

			// Start a new watch task.
			if (this.$settings.watch) {
				var me = this;
				this.$watch = setInterval(function(){
					me.buildData();
				}, this.$settings.watch);
			}

			// Update the dataset attribute to reflect the sanitized
			// configuration.
			var settingsString = JSON.stringify(this.$settings);
			this.$element.setAttribute('data-blobselect', settingsString);

			return true;
		},

		/**
		 * Build Container
		 *
		 * Build the main wrappers that achieve our styles.
		 *
		 * @return void Nothing.
		 */
		buildData: function() {
			if (!this.hasElement()) {
				return false;
			}

			// The parent element is easy.
			var tmp = {
					disabled: this.$element.disabled,
					required: this.$element.required,
					multiple: this.$element.multiple,
					items: [],
				},
				selected = [];

			// Update the data if there are changes.
			if (tmp.disabled !== this.$me.disabled) {
				this.$me.disabled = tmp.disabled;
				this.container.classList.toggle('is-disabled', tmp.disabled);
			}
			if (tmp.required !== this.$me.required) {
				this.$me.required = tmp.required;
				this.container.classList.toggle('is-required', tmp.required);
			}
			if (tmp.multiple !== this.$me.multiple) {
				this.$me.multiple = tmp.multiple;
				this.container.classList.toggle('is-multiple', tmp.multiple);
			}

			// Now gather data about all the items (options and
			// optgroups). Start with the latter as they'll be sorted
			// within themselves.
			var lastOptgroup = false,
				ungrouped = [],
				placeholderOption = this.$settings.placeholderOption.toLowerCase(),
				rows = [];

			// Loop through options!
			for (i=0; i<this.$element.options.length; i++) {
				v = this.$element.options[i];

				// New Optgroup
				if (
					(lastOptgroup !== v.parentNode) &&
					(
						(false !== lastOptgroup) ||
						(v.parentNode.tagName === 'OPTGROUP')
					)
				) {
					// Close off last one.
					if (false !== lastOptgroup) {
						rows = this.sort(rows);
						for (j=0; j<rows.length; j++) {
							tmp.items.push(rows[j]);
						}
					}

					if (v.parentNode.tagName === 'OPTGROUP') {
						// Add the optgroup to our items.
						row = {
							label: v.parentNode.label || v.parentNode.textContent || '',
							value: '',
							type: 'optgroup',
							disabled: v.parentNode.disabled,
							selected: false,
							placeholder: false,
							focused: false,
							grouped: false,
						};
						row.label = _sanitizeWhitespace(row.label);
						tmp.items.push(row);

						// Let the loop know.
						lastOptgroup = v.parentNode;
					}
					else {
						lastOptgroup = false;
					}

					rows = [];
				}

				// Deal with the option.
				row = {
					label: v.label || v.textContent || '',
					value: v.value,
					type: 'option',
					disabled: (v.disabled || v.parentNode.disabled),
					selected: v.selected,
					placeholder: false,
					focused: false,
					grouped: (false !== lastOptgroup),
				};
				row.label = _sanitizeWhitespace(row.label);

				// Placeholder is a little complicated to
				// calculate.
				row.placeholder = (
					!row.label.length ||
					(parseInt(v.dataset.placeholder, 10) === 1) ||
					(row.label.toLowerCase() === placeholderOption)
				);

				// Ungrouped item.
				if (false === lastOptgroup) {
					// Bubble placeholders straight to the top.
					if (row.placeholder) {
						tmp.items.unshift(row);
					}
					else {
						ungrouped.push(row);
					}
				}
				// Grouped item.
				else {
					rows.push(row);
				}
			}

			// Sort and add any leftover optgroup rows.
			if (rows.length) {
				rows = this.sort(rows);
				for (j=0; j<rows.length; j++) {
					tmp.items.push(rows[j]);
				}
			}

			// Sort and add any ungrouped rows.
			if (ungrouped.length) {
				ungrouped = this.sort(ungrouped);
				for (j=0; j<ungrouped.length; j++) {
					tmp.items.push(ungrouped[j]);
				}
			}

			// Do we need to rebuild the elements?
			var hash = _checksum(tmp);
			if (hash !== this.$itemsHash) {
				this.$items = tmp.items;

				// Update our selected/disabled lists.
				for (i=0; i<this.$items.length; i++) {
					if (this.$items[i].selected && !this.$items[i].disabled) {
						selected.push(i);
					}
				}

				this.$itemsHash = hash;
				this.$selectedItems = selected;

				// Update the selection hash.
				var hash2 = _checksum(selected);

				this.buildItems();

				// Rebuild selections only if needed.
				if (this.$selectedHash !== hash2) {
					this.$selectedHash = hash2;
					this.buildSelections();
				}
			}
		},

		/**
		 * Build Data
		 *
		 * Collect information about the main object and its items.
		 *
		 * @return void Nothing.
		 */
		buildContainer: function() {
			if (this.container !== null) {
				return false;
			}

			// The main container.
			this.container = document.createElement('div');
			this.container.classList.add('blobselect');
			if (this.$me.multiple) {
				this.container.classList.add('is-multiple');
			}
			if (this.$me.required) {
				this.container.classList.add('is-required');
			}
			if (this.$me.disabled) {
				this.container.classList.add('is-disabled');
			}
			this.container.tabIndex = this.$element.tabIndex || 0;
			this.$element.parentNode.insertBefore(this.container, this.$element);

			// Selections wrapper.
			this.selections = document.createElement('div');
			this.selections.classList.add('blobselect-selections');
			this.container.appendChild(this.selections);

			// Move the select into the container.
			this.container.appendChild(this.$element);

			// The dropdown button.
			this.button = document.createElement('div');
			this.button.classList.add('blobselect-button');
			this.container.appendChild(this.button);

			// The items wrapper.
			this.items = document.createElement('div');
			this.items.classList.add('blobselect-items');
			this.container.appendChild(this.items);

			// The search field gets offloaded to its own area.
			this.buildSearch();

			// Bind some actions!
			var me = this;

			// First action, a generic click-outside to close open
			// menus. We only need to bind this once.
			if (!clickOutside) {
				document.querySelector('html').addEventListener('click', _clickOutside);
			}

			// Watch for element changes.
			this.$element.addEventListener('change', function(){
				if (!me.$lock) {
					me.buildData();
				}
			});

			// Click and keypress.
			this.container.addEventListener('click', function(e) {
				return me.containerClick(e);
			});
			this.container.addEventListener('keyup', function(e) {
				return me.containerKey(e);
			});
		},

		/**
		 * Build Search
		 *
		 * @return void Nothing.
		 */
		buildSearch: function() {
			if (!this.isInitialized()) {
				return false;
			}

			// Search is off but we have the field.
			if (!this.$settings.search && this.search !== null) {
				_removeElement(this.search);
				this.search = null;
			}
			// Search is on but we have no field.
			else if(this.$settings.search && this.search === null) {
				this.search = document.createElement('div');
				this.search.classList.add('blobselect-item-search');
				this.search.setAttribute('type', 'text');
				this.search.setAttribute('contentEditable', 'true');
				this.search.tabIndex = 0;

				// Where to put it?
				if (this.items.firstChild) {
					this.items.insertBefore(this.search, this.items.firstChild);
				}
				else {
					this.items.appendChild(this.search);
				}
			}
		},

		/**
		 * Build Items
		 *
		 * @param bool $force Force.
		 * @return void Nothing.
		 */
		buildItems: function(force) {
			if (this.items === null) {
				return;
			}

			force = !!force;
			this.$search = '';

			var tmp,
				me = this;

			// Force a rebuild if the items don't match data.
			if (!force) {
				// Any new or removed items?
				var oldValues = [],
					newValues = [],
					label;

				// Find the values we're internally storing.
				for (i=0; i<this.$items.length; i++) {
					if (this.$items[i].type === 'optgroup') {
						value = '_optgroup_' + this.$items[i].label;
					}
					else {
						value = this.$items[i].value;
					}
					newValues.push(value);
				}

				// And find the current SELECT values.
				for (i=0; i<this.items.children.length; i++) {
					value = null;

					if (this.items.children[i].classList.contains('blobselect-item')) {
						value = this.items.children[i].dataset.value;
					}
					else if(this.items.children[i].classList.contains('blobselect-item-group')) {
						value = '_optgroup_' + this.items.children[i].dataset.label;
					}

					if (value !== null) {
						oldValues.push(value);
					}
				}

				// The lengths or contents are different; force a
				// rebuild.
				if (
					(newValues.length !== oldValues.length) ||
					(JSON.stringify(newValues) !== JSON.stringify(oldValues))
				) {
					force = true;
				}
			}

			// Forcefully rebuild all the items.
			if (force) {
				var newItems = [],
					tabIndex = 1;
				for (i=0; i<this.$items.length; i++) {
					tmp = document.createElement('div');

					// Optgroup-specific options.
					if (this.$items[i].type === 'optgroup') {
						tmp.classList.add('blobselect-item-group');
						tmp.textContent = this.$items[i].label;
					}
					// Option-specific options.
					else {
						tabIndex++;
						tmp.tabIndex = tabIndex;
						tmp.classList.add('blobselect-item');
						if (this.$items[i].placeholder) {
							tmp.classList.add('is-placeholder');
							tmp.textContent = this.$settings.placeholderOption;
						}
						else {
							tmp.textContent = this.$items[i].label;
						}
						if (this.$items[i].grouped) {
							tmp.classList.add('has-group');
						}
						if (this.$items[i].selected) {
							tmp.classList.add('is-active');
						}
					}

					if (this.$items[i].disabled) {
						tmp.classList.add('is-disabled');
					}

					tmp.setAttribute('data-type', this.$items[i].type);
					tmp.setAttribute('data-value', this.$items[i].value);
					tmp.setAttribute('data-label', this.$items[i].label);

					newItems.push(tmp);
				}

				// Remove old items.
				_removeElement(_find(this.items, '.blobselect-item, .blobselect-item-group'));

				// And insert the ones!
				for (i=0; i<newItems.length; i++) {
					this.items.appendChild(newItems[i]);

					// Nothing else to do for optgroups.
					if (newItems[i].dataset.type === 'optgroup') {
						continue;
					}

					// Bind a couple events.
					/* jshint ignore:start */
					newItems[i].addEventListener('focus', function(e) {
						me.items.setAttribute('data-focused', _find(me.items, '.blobselect-item').indexOf(e.target));
						e.target.classList.add('is-focused');
					});

					newItems[i].addEventListener('blur', function(e) {
						e.target.classList.remove('is-focused');
					});
					/* jshint ignore:end */
				}
			}
			// Update items in place. This saves overhead from
			// unnecessary DOM mutations and event binding.
			else {
				var key = -1;
				for (i=0; i<this.items.children.length; i++) {
					// We only want optgroups and options.
					if (
						!this.items.children[i].classList.contains('blobselect-item') &&
						!this.items.children[i].classList.contains('blobselect-item-group')
					) {
						continue;
					}

					key++;

					// Placeholder.
					if (this.$items[key].placeholder !== this.items.children[i].classList.contains('is-placeholder')) {
						this.items.children[i].classList.toggle('is-placeholder', this.$items[key].placeholder);
					}

					// Disabled.
					if (this.$items[key].disabled !== this.items.children[i].classList.contains('is-disabled')) {
						this.items.children[i].classList.toggle('is-disabled', this.$items[key].disabled);
					}

					// Grouped.
					if (this.$items[key].grouped !== this.items.children[i].classList.contains('has-group')) {
						this.items.children[i].classList.toggle('has-group', this.$items[key].grouped);
					}

					// Selected.
					if (this.$items[key].selected !== this.items.children[i].classList.contains('is-active')) {
						this.items.children[i].classList.toggle('is-active', this.$items[key].selected);
					}

					// Label.
					if (this.$items[key].label !== this.items.children[i].dataset.label) {
						this.items.children[i].setAttribute('data-label', this.$items[key].label);
					}

					// Value.
					if (this.$items[key].value !== this.items.children[i].dataset.value) {
						this.items.children[i].setAttribute('data-value', this.$items[key].value);
					}

					// Type.
					if (this.$items[key].type !== this.items.children[i].dataset.type) {
						if (this.$items[key].type === 'optgroup') {
							this.items.children[i].classList.add('blobselect-item-group');
							this.items.children[i].classList.remove('blobselect-item');

							// Remove events.
							try {
								var fieldEvents = getEventListeners(this.items.children[i]);
								for (j=0; j<fieldEvents.length; j++) {
									fieldEvents[j].remove();
								}
							} catch (Ex) {}
						}
						else {
							this.items.children[i].classList.add('blobselect-item-group');
							this.items.children[i].classList.remove('blobselect-item');

							// Bind the listeners.
							/* jshint ignore:start */
							this.items.children[i].addEventListener('focus', function(e) {
								me.items.setAttribute('data-focused', _find(me.items, '.blobselect-item').indexOf(e.target));
								e.target.classList.add('is-focused');
							});

							this.items.children[i].addEventListener('blur', function(e) {
								e.target.classList.remove('is-focused');
							});
							/* jshint ignore:end */
						}
						this.items.children[i].setAttribute('data-type', this.$items[key].type);
					}

					// textContent().
					var textContent = this.$items[key].label;
					if (this.$items[key].placeholder) {
						textContent = this.$settings.placeholderOption;
					}
					if (textContent !== this.items.children[i].textContent) {
						this.items.children[i].textContent = textContent;
					}
				}
			}
		},

		/**
		 * Build Selections
		 *
		 * @param bool $force Force.
		 * @return void Nothing.
		 */
		buildSelections: function(force) {
			if (this.selections === null) {
				return;
			}

			force = !!force;

			var tmp,
				me = this;

			// Force a rebuild if the selections don't match the data.
			if (!force) {
				// Any new or removed items?
				var oldValues = [],
					newValues = [],
					label;

				// What should be selected?
				for (i=0; i<this.$selectedItems.length; i++) {
					newValues.push(this.$items[this.$selectedItems[i]].value);
				}

				// And what do we have?
				for (i=0; i<this.selections.children.length; i++) {
					if (this.selections.children[i].classList.contains('blobselect-selection')) {
						oldValues.push(this.selections.children[i].dataset.value);
					}
				}

				// Gotta force it because things changed.
				if (
					(oldValues.length !== newValues.length) ||
					(JSON.stringify(oldValues) !== JSON.stringify(newValues))
				) {
					force = true;
				}
			}

			// Forcefully rebuild the selections.
			if (force) {
				var newItems = [];

				// Start by creating the new ones.
				for (i=0; i<this.$selectedItems.length; i++) {
					tmp = document.createElement('div');
					tmp.classList.add('blobselect-selection');
					tmp.setAttribute('data-value', this.$items[this.$selectedItems[i]].value);
					tmp.setAttribute('data-label', this.$items[this.$selectedItems[i]].label);

					if (this.$items[this.$selectedItems[i]].placeholder) {
						tmp.textContent = this.$settings.placeholder;
						tmp.classList.add('is-placeholder');
					}
					else {
						tmp.textContent = this.$items[this.$selectedItems[i]].label;
					}

					newItems.push(tmp);
				}
				newItems.sort(_sortTextContent);

				// Remove the old ones.
				_removeElement(_find(this.selections, '.blobselect-selection'));

				// And insert the new ones into the DOM.
				for (i=0; i<newItems.length; i++) {
					this.selections.appendChild(newItems[i]);
				}
			}
			// Nothing to do.
			else {
				return;
			}
		},

		// ------------------------------------------------------------- end init



		// -------------------------------------------------------------
		// State Handling
		// -------------------------------------------------------------

		/**
		 * Container Clicked
		 *
		 * @param event $e Event.
		 * @return void Nothing.
		 */
		containerClick: function(e) {
			e.stopPropagation();

			// Don't do anything if disabled.
			if (this.container.classList.contains('is-disabled')) {
				if (this.$me.state === 'open') {
					return this.close();
				}

				return;
			}

			// A (multi)selection.
			if (
				e.target.classList.contains('blobselect-selection') &&
				this.$me.multiple
			) {
				return this.unselect(e.target);
			}

			// The actual select field.
			else if(e.target === this.$element) {
				return;
			}

			// Search field.
			else if (e.target.classList.contains('blobselect-item-search')) {
				this.search.setAttribute('contentEditable', 'true');
				return;
			}

			// An item.
			else if(e.target.classList.contains('blobselect-item')) {
				// Select it if it isn't disabled.
				if (!e.target.classList.contains('is-disabled')) {
					this.select(e.target);
				}

				return;
			}

			// Toggle container state.
			if (this.$me.state === 'closed') {
				return this.open();
			}
			else {
				return this.close();
			}
		},

		/**
		 * Container Key Press
		 *
		 * @param event $e Event.
		 * @return void Nothing.
		 */
		containerKey: function(e) {
			var key = e.keyCode,
				map = {
					8: 'backspace',
					9: 'tab',
					13: 'enter',
					27: 'escape',
					32: 'space',
					37: 'left',
					38: 'up',
					39: 'right',
					40: 'down',
				},
				keyMapped = map[key] || 'other',
				keyPrintable = _isPrintableKey(key);

			// A closed menu.
			if (this.$me.state === 'closed') {
				// Almost always we want to open the menu.
				if (['tab','backspace'].indexOf(keyMapped) === -1) {
					e.stopPropagation();

					// Should we be adding the key to the search field?
					if (this.$settings.search && keyPrintable) {
						this.search.textContent = String.fromCharCode(key).toLowerCase();
						this.$search = '';
						this.filterItems();
					}

					return this.open();
				}
			}

			// Escape key.
			else if (keyMapped === 'escape') {
				e.stopPropagation();
				return this.close();
			}

			// Enter on current item.
			else if (keyMapped === 'enter') {
				e.stopPropagation();
				e.preventDefault();

				// Were we searching?
				if (this.$search) {
					this.search.innerHTML = _sanitizeWhitespace(this.search.textContent);
					this.$search = this.search.textContent;
				}

				// Select the selection.
				var choice = this.getActiveItem();
				if (choice) {
					return this.select(choice);
				}
				else {
					return this.close();
				}
			}

			// Navigation?
			else if (['tab', 'up', 'down', 'left', 'right'].indexOf(keyMapped) !== -1) {
				e.stopPropagation();

				// Maybe exit the search field.
				if (e.target.classList.contains('blobselect-item-search')) {
					if (['tab', 'up', 'down'].indexOf(keyMapped) !== -1) {
						return this.traverseItems('current');
					}

					return;
				}

				// Whereto?
				var direction = ['tab','down','right'].indexOf(keyMapped) !== -1 ? 'next' : 'back';
				return this.traverseItems(direction);
			}

			// Search typing?
			else if(e.target.classList.contains('blobselect-item-search')) {
				e.stopPropagation();

				// Refilter items?
				var searchText = _sanitizeWhitespace(this.search.textContent).toLowerCase();
				if (searchText !== this.$search) {
					this.$search = searchText;
					return this.filterItems();
				}

				return;
			}
		},

		/**
		 * Open Container
		 *
		 * @return void Nothing.
		 */
		open: function() {
			// Already open or not initialized, we're done.
			if (
				!this.isInitialized() ||
				(this.$me.state === 'open') ||
				(this.$me.state === 'opening')
			) {
				return;
			}

			// Close any other open select fields that might exist.
			var selects = _find(document, '.blobselect.is-open select');
			for (i=0; i<selects.length; i++) {
				selects[i].blobSelect.close();
			}

			var me = this;

			// Remove focus on the items.
			this.items.setAttribute('data-focused', -1);

			// Update the container.
			this.container.classList.add('is-opening');
			this.$me.state = 'opening';
			setTimeout(function() {
				me.$me.state = 'open';
				me.container.classList.add('is-open');
				me.container.classList.remove('is-opening');
			}, 50);

			// Jump to the search field.
			if (this.$settings.search) {
				this.search.setAttribute('contentEditable', 'true');
				this.search.focus();
				_cursorToEnd(this.search);
			}
		},

		/**
		 * Close Container
		 *
		 * @return void Nothing.
		 */
		close: function() {
			// Not initialized or open, can't be closed.
			if (
				!this.isInitialized() ||
				(this.$me.state !== 'open')
			) {
				return;
			}

			this.container.classList.remove('is-open','is-opening');
			this.items.setAttribute('data-focused', -1);
			this.$me.state = 'closed';
		},

		/**
		 * Trigger Change
		 *
		 * Fire a change event on the SELECT element so things get
		 * updated in the other direction.
		 *
		 * @return void Nothing.
		 */
		triggerChange: function() {
			if (this.isInitialized()) {
				this.$lock = true;

				var event = document.createEvent('UIEvents');
				event.initUIEvent('change', true, true, window, 1);
				this.$element.dispatchEvent(event);

				this.$lock = false;
			}
		},

		/**
		 * Select an Item
		 *
		 * @param DOMElement $el Element.
		 * @return bool True/false.
		 */
		select: function(el) {
			// Nothing to do.
			if (
				!this.isInitialized() ||
				!(el instanceof HTMLDivElement) ||
				!el.classList.contains('blobselect-item') ||
				el.classList.contains('is-disabled')
			) {
				return this.close();
			}

			var value = el.dataset.value,
				options = this.getOptionsByValue(value);

			if (options.length) {
				// We have to run through everything for multiple.
				if (this.$me.multiple) {
					for (i=0; i<options.length; i++) {
						// Turn off.
						if (options[i].selected) {
							options[i].selected = 0;
						}
						else {
							options[i].selected = 1;
						}
					}
				}
				else {
					this.$element.selectedIndex = options[0].index;
				}
			}
			// No match.
			else if (!this.$me.multiple) {
				this.$element.selectedIndex = this.$element.firstChild.index;
			}

			this.close();
			this.triggerChange();
			this.buildData();
		},

		/**
		 * Unselect an Item
		 *
		 * @param DOMElement $el Element.
		 * @return bool True/false.
		 */
		unselect: function(el) {
			if (
				!this.isInitialized() ||
				!this.$me.multiple ||
				!(el instanceof HTMLDivElement) ||
				!(el.classList.contains('blobselect-selection') || el.classList.contains('blobselect-item'))
			) {
				return this.close();
			}

			var value = el.dataset.value || '',
				options = this.getOptionsByValue(value);

			for (i=0; i<options.length; i++) {
				options[i].selected = 0;
			}

			this.close();
			this.triggerChange();
			this.buildData();
		},

		/**
		 * Filter Items
		 *
		 * @return void Nothing.
		 */
		filterItems: _debounce(function() {
			if (!this.isInitialized() || !this.$settings.search) {
				return false;
			}

			var me = this,
				items;

			// Nothing to search?
			if (!me.$search) {
				items = _find(me.items, '.is-not-match, .is-match');
				for (i=0; i<items.length; i++) {
					if (items[i].classList.contains('is-not-match')) {
						items[i].classList.remove('is-not-match');
					}
					if (items[i].classList.contains('is-match')) {
						items[i].classList.remove('is-match');
					}
					items[i].innerHTML = items[i].textContent;
				}

				return;
			}

			var needle = RegExp(_sanitizeRegExp(me.$search), 'i'),
				replaceNeedle = RegExp(_sanitizeRegExp(me.$search), 'gi'),
				matches = 0;

			items = _find(me.items, '.blobselect-item');
			for (i=0; i<items.length; i++) {
				var haystack = items[i].dataset.label,
					match = needle.test(haystack),
					classMatch = items[i].classList.contains('is-match'),
					classNoMatch = items[i].classList.contains('is-not-match');

				// Note that we have a match.
				if (match) {
					matches++;
				}

				// Reset haystack for placeholders.
				if (items[i].classList.contains('is-placeholder')) {
					haystack = me.$settings.placeholderOption;
				}

				items[i].textContent = haystack;

				if (match) {
					if (classNoMatch) {
						items[i].classList.remove('is-not-match');
					}
					if (!classMatch) {
						items[i].classList.add('is-match');
					}

					items[i].innerHTML = haystack.replace(replaceNeedle, "<mark>$&</mark>");
				}
				else {
					if (!classNoMatch) {
						items[i].classList.add('is-not-match');
					}
					if (classMatch) {
						items[i].classList.remove('is-match');
					}
				}
			}

			// Show everything if showing nothing.
			if (!matches) {
				items = _find(me.items, '.is-not-match, .is-match');
				for (i=0; i<items.length; i++) {
					if (items[i].classList.contains('is-not-match')) {
						items[i].classList.remove('is-not-match');
					}
					if (items[i].classList.contains('is-match')) {
						items[i].classList.remove('is-match');
					}
					items[i].innerHTML = items[i].textContent;
				}
			}

		}, 100),

		// ------------------------------------------------------------- end state



		// -------------------------------------------------------------
		// Traversal
		// -------------------------------------------------------------

		/**
		 * Move Through Items
		 *
		 * @param string $direction Direction.
		 * @return void Nothing.
		 */
		traverseItems: function(direction) {
			var active = this.getActiveItem(),
				items = _find(this.items, '.blobselect-item:not(.is-disabled):not(.is-not-match)'),
				activeIndex = items.indexOf(active) || -1,
				choice = null;

			// The active is impossible.
			if (activeIndex === -1) {
				if (items.length) {
					activeIndex = 0;
				}
				else {
					return;
				}
			}

			// Go to the current.
			if (direction === 'current') {
				choice = items[activeIndex];
			}

			// Back.
			else if (direction === 'back') {
				choice = activeIndex > 0 ? items[activeIndex - 1] : items[0];
			}

			// Next.
			else if (direction === 'next') {
				choice = activeIndex < items.length -1 ? items[activeIndex + 1] : items[activeIndex.length - 1];
			}

			return choice.focus();
		},


		/**
		 * Get Active Item
		 *
		 * @return DOMElement|bool Active or false.
		 */
		getActiveItem: function() {
			var choice,
				items = _find(this.items, '.blobselect-item'),
				focused = parseInt(this.items.dataset.focused, 10) || -1;

			// Make sure the selection makes sense.
			if (focused > items.length - 1) {
				this.items.setAttribute('data-focused', -1);
				focused = -1;
			}

			// Try the focused one first.
			if (focused !== -1) {
				choice = items[focused];
			}

			// Otherwise look for the first enabled and visible thing.
			if (
				!choice ||
				choice.classList.contains('is-disabled') ||
				choice.classList.contains('is-not-match')
			) {
				choice = null;
				for (i=0; i<items.length; i++) {
					if (
						!items[i].classList.contains('is-disabled') &&
						!items[i].classList.contains('is-not-match')
					) {
						choice = items[i];
						break;
					}
				}
			}

			return choice;
		},

		/**
		 * Get Item By Value
		 *
		 * @param string $value Value.
		 * @param bool $disabled Allow disabled.
		 * @return object Item(s).
		 */
		getItemsByValue: function(value, disabled) {
			disabled = !!disabled;
			value = value + '';

			var out = [];

			for (i=0; i<this.$items.length; i++) {
				if (
					(this.$items[i].type === 'option') &&
					(this.$items[i].value === value) &&
					(disabled || !this.$items[i].disabled)
				) {
					out.push(i);
				}
			}

			return out;
		},

		/**
		 * Get Options By Value
		 *
		 * @param string $value Value.
		 * @param bool $disabled Allow disabled.
		 * @return object Item(s).
		 */
		getOptionsByValue: function(value, disabled) {
			disabled = !!disabled;
			value = value + '';

			var out = [],
				options = _find(this.$element, 'option');

			for (i=0; i<options.length; i++) {
				if (
					(options[i].value === value) &&
					(disabled || !options[i].disabled)
				) {
					out.push(options[i]);
				}
			}

			return out;
		},

		// ------------------------------------------------------------- end traversal



		// -------------------------------------------------------------
		// Misc
		// -------------------------------------------------------------

		/**
		 * Sort Items
		 *
		 * @param object $arr Array.
		 * @return object Array.
		 */
		sort: function(arr) {
			if (!Array.isArray(arr) || !arr.length) {
				return [];
			}

			// No sorting?
			if (!this.$settings.orderType) {
				return arr;
			}

			switch (this.$settings.orderType + this.$settings.order) {
				case 'stringASC':
					arr.sort(_sortStringAsc);
					break;
				case 'stringDESC':
					arr.sort(_sortStringDesc);
					break;
				case 'numericASC':
					arr.sort(_sortNumericAsc);
					break;
				case 'numericDESC':
					arr.sort(_sortNumericDesc);
					break;
			}

			return arr;
		},

		// ------------------------------------------------------------- end misc
	};

	// ----------------------------------------------------------------- end plugin



	// -----------------------------------------------------------------
	// DOM Extension
	// -----------------------------------------------------------------

	/**
	 * Extend Prototype
	 *
	 * Add the blobSelect object to the HTMLSelectElement prototype so
	 * it can be accessed via el.blobSelect.
	 *
	 * @return void Nothing.
	 */
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

	// ----------------------------------------------------------------- end extension



	// -----------------------------------------------------------------
	// Auto-Initialize
	// -----------------------------------------------------------------

	/**
	 * Init
	 *
	 * Find any <SELECT> fields that should be blob-selected and run the
	 * init() handler on them.
	 *
	 * @return void Nothing.
	 */
	document.addEventListener('DOMContentLoaded', function(){
		var selects = document.querySelectorAll('select[data-blobselect], select[data-blobselect-watch], select[data-blobselect-search], select[data-blobselect-placeholder], select[data-blobselect-placeholder-option], select[data-blobselect-order], select[data-blobselect-order-type]');

		for (i=0; i<selects.length; i++) {
			var el = selects.item(i);
			el.blobSelect.init();
		}
	});

	// ----------------------------------------------------------------- end init



	// -----------------------------------------------------------------
	// Data Helpers
	// -----------------------------------------------------------------

	/**
	 * Deep Clone
	 *
	 * Javascript objects are always passed by reference. This is a
	 * simple clone method that can allow code to work with a copy
	 * instead.
	 *
	 * @see {https://davidwalsh.name/javascript-clone}
	 *
	 * @param mixed $src Source variable.
	 * @return mixed Copy.
	 */
	function _clone(src) {
		// Internal copy helper.
		function mixin(dest, source, copyFunc) {
			var name, s, i, empty = {};
			for (name in source) {
				s = source[name];
				if (!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))) {
					dest[name] = copyFunc ? copyFunc(s) : s;
				}
			}
			return dest;
		}

		if (!src || typeof src != "object" || Object.prototype.toString.call(src) === "[object Function]") {
			// Covers null, undefined, any non-object, or function.
			return src;
		}

		if (src.nodeType && "cloneNode" in src) {
			// DOM Node.
			return src.cloneNode(true); // Node
		}

		if (src instanceof Date) {
			// Date.
			return new Date(src.getTime());	// Date
		}

		if (src instanceof RegExp) {
			// RegExp.
			return new RegExp(src);   // RegExp
		}

		var r, i, l;
		if (src instanceof Array) {
			// Array.
			r = [];
			for (i = 0, l = src.length; i < l; ++i) {
				if (i in src) {
					r.push(_clone(src[i]));
				}
			}
		}
		else{
			// Some other object type.
			r = src.constructor ? new src.constructor() : {};
		}
		return mixin(r, src, _clone);
	}

	/**
	 * Type Casting
	 *
	 * We can make some assumptions based on the limited use case of
	 * this plugin.
	 *
	 * @param mixed $value Value.
	 * @param string $type Type.
	 * @return Cast value.
	 */
	function _cast(value, type) {
		var valueType = typeof value;
		if (valueType === type) {
			return value;
		}

		switch (type) {
			case 'string':
				try {
					if (!value) {
						value = '';
					}
					else {
						value = String(value);
					}
				} catch (Ex) {
					value = '';
				}

				break;
			case 'number':
				try {
					if (valueType === 'boolean') {
						value = value ? 1 : 0;
					}
					else {
						value = Number(value);
					}
				} catch (Ex) {
					value = 0;
				}

				break;
			case 'boolean':
				try {
					// Let's try to catch boolish strings.
					if (valueType === 'string') {
						var valueLower = value.toLowerCase();
						if (['off','0','false'].indexOf(valueLower) !== -1) {
							value = false;
						}
						else if(['on','1','true'].indexOf(valueLower) !== -1) {
							value = true;
						}
					}
					value = !!value;
				} catch (Ex) {
					value = false;
				}

				break;
		}

		return value;
	}

	/**
	 * Is Object
	 *
	 * Javascript does not get very specific with types. This functions
	 * similarly to typeof but discounts things like Null or Undefined.
	 *
	 * @param mixed $value Value.
	 * @return bool True/false.
	 */
	function _isObject(value) {
		var valueType = typeof value;

		return (
			(valueType !== 'undefined') &&
			(value !== null) &&
			(valueType === 'object')
		);
	}

	/**
	 * Is Array
	 *
	 * Test if an item is an actual, sequentially-index Array, or some
	 * other kind of object.
	 */
	function _isArray(value) {
		return _isObject(value) && Array.isArray(value);
	}

	/**
	 * Parse Arguments
	 *
	 * Stuff user arguments into a default mold. Note: This function is
	 * not recursive.
	 *
	 * @param object $args User arguments.
	 * @param object $defaults Default arguments.
	 * @param bool $strict Strict.
	 * @return object Parsed arguments.
	 */
	function _parseArgs(args, defaults, strict) {
		// Sanitize types.
		if (typeof defaults !== 'object') {
			return {};
		}
		if (typeof args !== 'object') {
			return defaults;
		}
		if (strict === null || strict === undefined) {
			strict = true;
		}
		else {
			strict = !!strict;
		}

		var parsed = _clone(defaults),
			keys = Object.keys(args),
			keysLength = keys.length;

		// Do we need to be here?
		if (!keysLength) {
			return parsed;
		}

		// Run through the user arguments and include anything in the
		// template.
		for (i=0; i<keysLength; i++) {
			if (typeof parsed[keys[i]] !== 'undefined') {
				var argValue = _clone(args[keys[i]]);

				// Typecast result.
				if (strict && (parsed[keys[i]] !== null)) {
					var argType = typeof argValue,
						defaultType = typeof parsed[keys[i]];

					if (argType !== defaultType) {
						argValue = _cast(argValue, defaultType);
					}
				}

				parsed[keys[i]] = argValue;
			}
		}

		return parsed;
	}

	/**
	 * Parse JSON
	 *
	 * This wrapper will help prevent the plugin from exploding on bad
	 * data. It also preferentially uses JSON5's decoder, which
	 * interprets data more similarly to native Javascript (it isn't
	 * super picky about quotes, etc.
	 *
	 * @param string $str String.
	 * @return object JSON.
	 */
	function _parseJSON(str) {
		// Already an object?
		if (typeof str === 'object') {
			return str;
		}

		try {
			var j = _JSON5.parse(str);
			if (j !== null) {
				return j;
			}
		} catch (Ex) { console.warn(Ex); }

		return {};
	}

	/**
	 * Sanitize RegExp Characters
	 *
	 * This is used for e.g. search matching, etc., where user input
	 * might contain characters that would mess up a test.
	 *
	 * @param string $str String.
	 * @return string Sanitized string.
	 */
	function _sanitizeRegExp(str) {
		try {
			str = str + '';
			return str.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&");
		} catch (Ex) {}

		return '';
	}

	/**
	 * Sanitize Whitespace
	 *
	 * Whitespace is easy to handle inconsistently; let's just assume
	 * that one-space/two-space variations are never intentional.
	 *
	 * @param string $str String.
	 * @return string Sanitized string.
	 */
	function _sanitizeWhitespace(str) {
		try {
			str = str + '';
			return str.replace(/\s{1,}/g, ' ').trim();
		} catch (Ex) {}

		return '';
	}

	// ----------------------------------------------------------------- end data helpers



	// -----------------------------------------------------------------
	// DOM helpers
	// -----------------------------------------------------------------

	/**
	 * Query Selector
	 *
	 * Return query results as an array.
	 *
	 * @param DOMElement $el Element.
	 * @param string $selector Selector.
	 */
	function _find(el, selector) {
		var out = [];

		try {
			selector = selector + '';
			var results = el.querySelectorAll(selector);
			if (results.length) {
				for (i=0; i<results.length; i++) {
					out.push(results.item(i));
				}
			}
		} catch (Ex) {}

		return out;
	}

	/**
	 * Find Closest Element
	 *
	 * @param DOMElement $el Reference element.
	 * @param string $selector Selector.
	 * @return DOMElement|bool Element or false.
	 */
	function _closest(el, selector) {
		try {
			selector = selector + '';

			// The self is the closest possible match!
			if (el.matches(selector)) {
				return el;
			}

			// Move up the tree.
			while (el.parentNode && 'matches' in el.parentNode) {
				el = el.parentNode;
				if (el.matches(selector)) {
					return el;
				}
			}
		} catch (Ex) {}

		return false;
	}

	/**
	 * Remove Element
	 *
	 * @param mixed $el Element(s).
	 * @return void Nothing.
	 */
	function _removeElement(el) {
		if (!Array.isArray(el) && el instanceof HTMLElement) {
			el = [el];
		}

		// Make sure whatever kind of objecty thing we have is iterable.
		var keys;
		try {
			keys = Object.keys(el);
		} catch (Ex) {
			return;
		}

		// Run through the list backwards and delete everyone.
		for (i=keys.length - 1; i >= 0; i--) {
			// This must be an element.
			if (!(el[keys[i]] instanceof HTMLElement)) {
				continue;
			}

			// Unbind events.
			try {
				var fieldEvents = getEventListeners(el[keys[i]]);
				for (j=0; j<fieldEvents.length; j++) {
					fieldEvents[j].remove();
				}
			} catch (Ex) {}

			// Remove the field.
			el[keys[i]].parentNode.removeChild(el[keys[i]]);
		}
	}

	// ----------------------------------------------------------------- end dom helpers



	// -----------------------------------------------------------------
	// Sorting
	// -----------------------------------------------------------------

	/**
	 * Sort Strings Asc
	 *
	 * @param object $a First.
	 * @param object $b Second.
	 * @return int Position.
	 */
	function _sortStringAsc(a, b) {
		// Placeholders bubble to top.
		if (a.placeholder) {
			return -1;
		}
		else if(b.placeholder) {
			return 1;
		}

		// Otherwise just sort by label.
		return a.label.toLowerCase() < b.label.toLowerCase() ? -1 : 1;
	}

	/**
	 * Sort Strings Desc
	 *
	 * @param object $a First.
	 * @param object $b Second.
	 * @return int Position.
	 */
	function _sortStringDesc(a, b) {
		// Placeholders bubble to top.
		if (a.placeholder) {
			return -1;
		}
		else if(b.placeholder) {
			return 1;
		}

		// Otherwise just sort by label.
		return a.label.toLowerCase() > b.label.toLowerCase() ? -1 : 1;
	}

	/**
	 * Sort Numeric Asc
	 *
	 * @param object $a First.
	 * @param object $b Second.
	 * @return int Position.
	 */
	function _sortNumericAsc(a, b) {
		// Placeholders bubble to top.
		if (a.placeholder) {
			return -1;
		}
		else if(b.placeholder) {
			return 1;
		}

		var atext = Number(a.label.replace(/[^\d\.]/g, '')) || 0,
			btext = Number(b.label.replace(/[^\d\.]/g, '')) || 0;

		// Otherwise just sort by label.
		return atext < btext ? -1 : 1;
	}

	/**
	 * Sort Numeric Desc
	 *
	 * @param object $a First.
	 * @param object $b Second.
	 * @return int Position.
	 */
	function _sortNumericDesc(a, b) {
		// Placeholders bubble to top.
		if (a.placeholder) {
			return -1;
		}
		else if(b.placeholder) {
			return 1;
		}

		var atext = Number(a.label.replace(/[^\d\.]/g, '')) || 0,
			btext = Number(b.label.replace(/[^\d\.]/g, '')) || 0;

		// Otherwise just sort by label.
		return atext > btext ? -1 : 1;
	}

	/**
	 * Sort Selections
	 *
	 * Selections are sorted by their effective textContent, and always
	 * in ascending order.
	 *
	 * @param object $a First.
	 * @param object $b Second.
	 * @return int Position.
	 */
	function _sortTextContent(a, b) {
		var atext = a.textContent.toLowerCase(),
			btext = b.textContent.toLowerCase();

		if (atext === btext) {
			return 0;
		}

		return atext < btext ? -1 : 1;
	}

	// ----------------------------------------------------------------- end sort



	// -----------------------------------------------------------------
	// UX/Input Helpers
	// -----------------------------------------------------------------

	/**
	 * Cursor to End
	 *
	 * Move the cursor position to the end of a field.
	 *
	 * @param DOMElement $el Element.
	 * @return void Nothing.
	 */
	function _cursorToEnd(el) {
		var searchRange = document.createRange(),
			searchSelection;

		searchRange.selectNodeContents(el);
		searchRange.collapse(false);
		searchSelection = window.getSelection();
		searchSelection.removeAllRanges();
		searchSelection.addRange(searchRange);
	}

	/**
	 * Printable Keystroke
	 *
	 * This helps differentiate between keystrokes which should add to
	 * a field's value, like the letter "a", versus others that
	 * shouldn't, like ESC.
	 *
	 * @param int $key Key code.
	 * @return bool True/false.
	 */
	function _isPrintableKey(key) {
		return (
			(key > 47 && key < 58) ||	// Number keys.
			(key > 64 && key < 91) ||	// Letter keys.
			(key > 95 && key < 112) ||	// Numpad keys.
			(key > 185 && key < 193) ||	// Punctuation.
			(key > 218 && key < 223)	// Brackets.
		);
	}

	// ----------------------------------------------------------------- end ux/input helpers



	// -----------------------------------------------------------------
	// Misc Helpers
	// -----------------------------------------------------------------

	/**
	 * Click Outside Handler
	 *
	 * We want to close open blob-select fields any time a non-select is
	 * clicked.
	 *
	 * This is bound to document.html.
	 *
	 * @param event $e Event.
	 * @return void Nothing.
	 */
	var _clickOutside = function(e) {
		var selects = _find(document, '.blobselect select');
		if (selects.length) {
			// If a blob-select field was clicked, we can leave.
			if (_closest(e.target, '.blobselect') !== false) {
				return true;
			}

			// Otherwise close anything that is open.
			selects = _find(document, '.blobselect.is-open select');
			for (i=0; i<selects.length; i++) {
				selects[i].blobSelect.close();
			}
		}
		// If there aren't any blob-select fields, we can unbind this.
		else {
			clickOutside = false;
			document.querySelector('html').removeEventListener('click', _clickOutside);
		}
	};

	/**
	 * Debounce
	 *
	 * @param function $fn Callback.
	 * @param bool $wait Wait.
	 * @param bool $no_postpone Do it now.
	 */
	function _debounce(fn, wait, no_postpone){
		var args, context, result, timeout;
		var executed = true;

		// Execute the callback function.
		function ping(){
			result = fn.apply(context || this, args || []);
			context = args = null;
			executed = true;
		}

		// Cancel the timeout.
		function cancel() {
			if(timeout){
				clearTimeout(timeout);
				timeout = null;
			}
		}

		// Generate a wrapper function to return.
		function wrapper() {
			context = this;
			args = arguments;
			if (!no_postpone) {
				cancel();
				timeout = setTimeout(ping, wait);
			}
			else if (executed) {
				executed = false;
				timeout = setTimeout(ping, wait);
			}
		}

		// Reset.
		wrapper.cancel = cancel;
		return wrapper;
	}

	/**
	 * Simple Checksum
	 *
	 * The original value of each field is stored so that its change
	 * status can be detected.
	 *
	 * To make comparisons easier, and to cut down on memory waste,
	 * values are stored as a very simple checksum.
	 *
	 * @param mixed $value Value.
	 * @return string Hash.
	 */
	function _checksum(value) {
		try {
			// We need a string. For objects, JSON will suffice.
			if (typeof value === 'object') {
				value = JSON.stringify(value) || false;
				if (value === false) {
					return 0;
				}
			}
			// For everything else, just try to cast it.
			else {
				value = value + '';
			}
		} catch (Ex) {
			return 0;
		}

		// Declare our variables.
		var hash = 0,
			strlen = value.length,
			i,
			c;

		for (i=0; i<strlen; i++) {
			c = value.charCodeAt(i);
			hash = ((hash << 5) - hash) + c;
			hash = hash & hash; // Convert to 32-bit integer.
		}

		return hash;
	}

	/**
	 * JSON5 Parser
	 *
	 * A more human-friendly take on JSON.
	 *
	 * @see https://github.com/douglascrockford/JSON-js/blob/master/json_parse.js
	 * @see http://json5.org/
	 */
	/* jshint ignore:start */
	var _JSON5={};
	_JSON5.parse=function(){"use strict";var r,e,n,t,i,f,o={"'":"'",'"':'"',"\\":"\\","/":"/","\n":"",b:"\b",f:"\f",n:"\n",r:"\r",t:"\t"},a=[" ","\t","\r","\n","\v","\f"," ","\ufeff"],u=function(r){return""===r?"EOF":"'"+r+"'"},c=function(t){var f=new SyntaxError;throw f.message=t+" at line "+e+" column "+n+" of the JSON5 data. Still to read: "+JSON.stringify(i.substring(r-1,r+19)),f.at=r,f.lineNumber=e,f.columnNumber=n,f},s=function(f){return f&&f!==t&&c("Expected "+u(f)+" instead of "+u(t)),t=i.charAt(r),r++,n++,("\n"===t||"\r"===t&&"\n"!==l())&&(e++,n=0),t},l=function(){return i.charAt(r)},d=function(){var r=t;for("_"!==t&&"$"!==t&&(t<"a"||t>"z")&&(t<"A"||t>"Z")&&c("Bad identifier as unquoted key");s()&&("_"===t||"$"===t||t>="a"&&t<="z"||t>="A"&&t<="Z"||t>="0"&&t<="9");)r+=t;return r},m=function(){var r,e="",n="",i=10;if("-"!==t&&"+"!==t||(e=t,s(t)),"I"===t)return("number"!=typeof(r=h())||isNaN(r))&&c("Unexpected word for number"),"-"===e?-r:r;if("N"===t)return r=h(),isNaN(r)||c("expected word to be NaN"),r;switch("0"===t&&(n+=t,s(),"x"===t||"X"===t?(n+=t,s(),i=16):t>="0"&&t<="9"&&c("Octal literal")),i){case 10:for(;t>="0"&&t<="9";)n+=t,s();if("."===t)for(n+=".";s()&&t>="0"&&t<="9";)n+=t;if("e"===t||"E"===t)for(n+=t,s(),"-"!==t&&"+"!==t||(n+=t,s());t>="0"&&t<="9";)n+=t,s();break;case 16:for(;t>="0"&&t<="9"||t>="A"&&t<="F"||t>="a"&&t<="f";)n+=t,s()}if(r="-"===e?-n:+n,isFinite(r))return r;c("Bad number")},N=function(){var r,e,n,i,f="";if('"'===t||"'"===t)for(n=t;s();){if(t===n)return s(),f;if("\\"===t)if(s(),"u"===t){for(i=0,e=0;e<4&&(r=parseInt(s(),16),isFinite(r));e+=1)i=16*i+r;f+=String.fromCharCode(i)}else if("\r"===t)"\n"===l()&&s();else{if("string"!=typeof o[t])break;f+=o[t]}else{if("\n"===t)break;f+=t}}c("Bad string")},b=function(){"/"!==t&&c("Not an inline comment");do{if(s(),"\n"===t||"\r"===t)return void s()}while(t)},p=function(){"*"!==t&&c("Not a block comment");do{for(s();"*"===t;)if(s("*"),"/"===t)return void s("/")}while(t);c("Unterminated block comment")},v=function(){"/"!==t&&c("Not a comment"),s("/"),"/"===t?b():"*"===t?p():c("Unrecognized comment")},y=function(){for(;t;)if("/"===t)v();else{if(!(a.indexOf(t)>=0))return;s()}},h=function(){switch(t){case"t":return s("t"),s("r"),s("u"),s("e"),!0;case"f":return s("f"),s("a"),s("l"),s("s"),s("e"),!1;case"n":return s("n"),s("u"),s("l"),s("l"),null;case"I":return s("I"),s("n"),s("f"),s("i"),s("n"),s("i"),s("t"),s("y"),1/0;case"N":return s("N"),s("a"),s("N"),NaN}c("Unexpected "+u(t))},w=function(){var r=[];if("["===t)for(s("["),y();t;){if("]"===t)return s("]"),r;if(","===t?c("Missing array element"):r.push(f()),y(),","!==t)return s("]"),r;s(","),y()}c("Bad array")},g=function(){var r,e={};if("{"===t)for(s("{"),y();t;){if("}"===t)return s("}"),e;if(r='"'===t||"'"===t?N():d(),y(),s(":"),e[r]=f(),y(),","!==t)return s("}"),e;s(","),y()}c("Bad object")};return f=function(){switch(y(),t){case"{":return g();case"[":return w();case'"':case"'":return N();case"-":case"+":case".":return m();default:return t>="0"&&t<="9"?m():h()}},function(o,a){var u;return i=String(o),r=0,e=1,n=1,t=" ",u=f(),y(),t&&c("Syntax error"),"function"==typeof a?function r(e,n){var t,i,f=e[n];if(f&&"object"==typeof f)for(t in f)Object.prototype.hasOwnProperty.call(f,t)&&(void 0!==(i=r(f,t))?f[t]=i:delete f[t]);return a.call(e,n,f)}({"":u},""):u}}();
	/* jshint ignore:end */

	// ----------------------------------------------------------------- end misc

})();