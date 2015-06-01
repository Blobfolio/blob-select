/**
*
* blobSelect
* version: 0.5
* home: https://blobfolio.com
*
* use:
*	<select data-blobselect="{OPTIONS}">
*	select fields with the data-blobselect attribute are auto-initialized on load
*	select fields can be manually initialized with:
*		new blobSelect(getElementById('the-field'))
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
*	placeholder
*		(string)
*		text to use if an option has no label
*		default: ---
*	search
*		(bool)
*		a contentEditable field is placed at the top of the menu
*		to allow users to filter results
*		default: false
*
**/
(function(){

	//---------------------------------------------------------------------
	// Helpers
	//---------------------------------------------------------------------

	//-------------------------------------------------
	// jQuery-like nice selector
	//
	// stole this from Lea Verou :)
	//
	// @param expression
	// @param container
	// @return results
	function $(expr, con){
		if (!expr) return null;
		return typeof expr === 'string'? (con || document).querySelector(expr) : expr;
	}
	//and for arrays
	function $$(expr, con){
		return Array.prototype.slice.call((con || document).querySelectorAll(expr));
	}

	//-------------------------------------------------
	// Whether various JS properties we're using are
	// supported
	//
	// on failure, the <select> will be left alone
	//
	// @param n/a
	// @return true/false
	function _hasSupport(){
		try {
			//we need querySelector support
			document.querySelectorAll('select');

			//and JSON support
			if(typeof JSON !== 'object' || typeof JSON.parse !== 'function')
				return false;

			return true;
		} catch(e){
			return false;
		}
	}

	//-------------------------------------------------
	// jQuery-like .extend()
	//
	// @param defaults
	// @param overrides
	// @return extended
	function _extend(defaults, overrides){
		var extended = {};
		_forEach(defaults, function (value, key) {
			extended[key] = defaults[key];
		});
		_forEach(overrides, function (value, key) {
			extended[key] = overrides[key];
		});
		return extended;
	}

	//-------------------------------------------------
	// forEach() wrapper that can loop through
	// [object Object]s too
	//
	// @param collection
	// @param callback (value, key, collection)
	// @return n/a
	function _forEach(collection, callback){
		if(Object.prototype.toString.call(collection) === '[object Object]')
		{
			for (var key in collection)
			{
				if (Object.prototype.hasOwnProperty.call(collection, key))
					callback(collection[key], key, collection);
			}
		}
		else
		{
			for (var key = 0, len = collection.length; key < len; key++)
				callback(collection[key], key, collection);
		}
	}

	//-------------------------------------------------
	// Sanitize regexp characters
	//
	// also stole this from Lea Verou!
	//
	// @param str
	// @return str
	function _sanitizeRegexp(s) { return s.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&"); }

	//-------------------------------------------------
	// JSON.parse() wrapper that won't explode if
	// passed non-JSON data
	//
	// @param string
	// @return JSON or {}
	function _parseJSON(str){
		try {
			var j = JSON.parse(str);
			return j;
		}
		catch (e) {
			return {};
		}
	}

	//-------------------------------------------------
	// jQuery-like .remove()
	//
	// @param element(s)
	// @return n/a
	function _removeElement(elements){
		_forEach(elements, function(element){
			element.parentNode.removeChild(element);
		});
	}

	//-------------------------------------------------
	// bind wrapper
	//
	// @param element
	// @param event
	// @param callback
	// @return true/false
	function _bind(element, event, callback) {
		if(!element || typeof callback !== 'function' || !event)
			return false;

		element.addEventListener(event, callback, false);
	}

	//-------------------------------------------------
	// classes as array
	//
	// @param element
	// @return classes
	function _getClasses(element){
		var classString = element.getAttribute('class');
		if(classString === null)
			classString = '';
		classString = classString.replace('/\s{1,}/g', ' ').trim();

		if(classString.indexOf(' ') !== -1)
			return classString.split(' ');
		else if(classString.length)
		{
			var arr = [];
			arr.push(classString);
			return arr;
		}
		else
			return [];
	}

	//-------------------------------------------------
	// jQuery-like .hasClass()
	//
	// @param element
	// @param class
	// @return true/false
	function _hasClass(element, c){
		var classes = _getClasses(element);
		return classes.indexOf(c) !== -1;
	}

	//-------------------------------------------------
	// jQuery-like .addClass()
	//
	// @param element
	// @param class
	// @return true
	function _addClass(element, c){
		if(!_hasClass(element, c))
		{
			var classes = _getClasses(element);
			classes.push(c);
			element.setAttribute('class', classes.join(' '));
		}

		return true;
	}

	//-------------------------------------------------
	// jQuery-like .removeClass()
	//
	// @param element
	// @param class
	// @return true
	function _removeClass(element, c){
		var classes = _getClasses(element),
			index = classes.indexOf(c);

		if(index !== -1)
		{
			classes.splice(index, 1);
			element.setAttribute('class', classes.join(' '));
		}
		return true;
	}

	//---------------------------------------------------------------------
	// blobSelect
	//---------------------------------------------------------------------

	//default settings
	var defaultSettings = {	"orderType" : "",		//sort options by something?
							"order" : "ASC",		//sort direction
							"placeholder" : "---",	//text to use if an <option> has no label
							"search" : false		//create an input field to filter results
						  };

	//the blobSelect object
	var _ = self.blobSelect = function(element){
		var b = this;

		//this should be a select element
		//and the browser has to support some of the nicer javascript we're using
		if(typeof element !== 'object' || element.tagName !== 'SELECT' || !_hasSupport())
			return;

		//some set up
		b.element = element;
		b.status = parseInt(b.element.getAttribute('data-blobselected')) || 0;
		b.settings = _extend(defaultSettings, _parseJSON(b.element.getAttribute('data-blobselect')));
		//if a person passed a string instead of a bool...
		if(b.settings.search === 'true')
			b.settings.search = true;
		b.options = {};
		b.selections = [];
		b.multiple = (b.element.getAttribute('multiple') === null) ? false : true;
		b.events = [];
		b.updateLock = false;
		b.previous = [];

		//don't double-build this
		if(b.status)
			return;

		//are we sorting anything?
		if(b.settings.order && ['ASC','DESC'].indexOf(b.settings.order.toUpperCase()) !== -1 && b.settings.orderType && ['string','numeric'].indexOf(b.settings.orderType.toLowerCase()) !== -1)
			b.sortOptions();

		//do we need to build it?
		b.build();
	}

	//extend the blobSelect object a bit...
	_.prototype = {

		//-------------------------------------------------
		// (re)build blobSelect
		//
		// if called on already built blobSelect, it will
		// trigger destroy(), then build it again
		//
		// @param n/a
		// @return n/a
		build: function(){

			var b = this;

			//if rebuilding, destroy it first
			if(b.status)
				b.destroy();

			//.blobselect wraps around the <select>
			var container = document.createElement('div');
				_addClass(container, 'blobselect');
				if(b.multiple)
					_addClass(container, 'is-multiple');
				var ti = b.element.tabIndex || 0;
				container.tabIndex = ti;
				b.element.tabIndex = -1;
			b.element.parentNode.insertBefore(container, b.element);

			//.blobselect-selections holds selected value(s)
			var selections = document.createElement('div');
				selections.setAttribute('class', 'blobselect-selections');
			container.appendChild(selections);

			//move <select> inside the container
			container.appendChild(b.element);

			//add a button
			var button = document.createElement('div');
				_addClass(button, 'blobselect-button');
			container.appendChild(button);

			//set up the list of possibilities
			var list = document.createElement('div');
				list.setAttribute('class','blobselect-items');
			container.appendChild(list);

			if(b.settings.search === true)
			{
				//add a special entry containing a text input
				//which we'll use for type-searching
				var searchField = document.createElement('div');
					_addClass(searchField, 'blobselect-item-search');
					searchField.setAttribute('type', 'text');
					searchField.setAttribute('contentEditable','true');
				list.appendChild(searchField);
			}

			//go through <options> and add them to our list
			_forEach($$('optgroup, option', b.element), function(option){

				var classes = [];

				//<optgroup> will be represented as a non-selectable list item
				if(option.tagName === 'OPTGROUP')
					classes.push('blobselect-item-group');
				//<option> is a regular list item
				else
				{
					classes.push('blobselect-item');
					if(option.selected)
						classes.push('is-active');
					if(option.parentNode.tagName === 'OPTGROUP')
						classes.push('has-group');

					//add this to our list-o-options
					if(option.textContent.trim().length && option.textContent.trim().toLowerCase() !== b.settings.placeholder.toLowerCase())
						b.options[option.value] = option.textContent;
					else
					{
						b.options[option.value] = b.settings.placeholder;
						classes.push('is-placeholder');
					}
				}

				//start the item
				var item = document.createElement('div');
					item.setAttribute('class', classes.join(' '));

				//optgroup uses "label"
				if(option.tagName === 'OPTGROUP')
					item.textContent = option.label;
				//options use textContent
				else
				{
					item.setAttribute('tabIndex', 1);
					item.setAttribute('data-value', option.value);
					item.textContent = option.textContent;
					if(!item.textContent.trim().length)
						item.textContent = b.settings.placeholder;
				}

				list.appendChild(item);
			});

			//update selection(s)
			b.updateSelections();

			//that's the HTML out of the way, now let's BIND stuff!

			//first, handle select changes
			_bind(b.element, 'change', function(){
				b.updateSelections();
			});
			_bind(b.element, 'click', function(){
				b.updateSelections();
			});

			//close on outside click
			_bind(document.querySelector('html'), 'click', function(e){
				if(_hasClass(b.element.parentNode, 'is-open'))
				{
					//make sure the target isn't a blobselect
					if(_hasClass(e.target.parentNode, 'blobselect') || _hasClass(e.target, 'blobselect') || /blobselect/.test(e.target.className))
						return true;
					else
						b.close();
				}
			});

			//handle select changes in the reverse!
			_forEach($$('.blobselect-item', b.element.parentNode), function(option){
				//on click
				_bind(option, 'click', function(e){
					e.stopPropagation();
					var value = option.getAttribute('data-value');

					//already selected?
					if(b.selections.indexOf(value) !== -1)
					{
						//deselect if multiselect
						if(b.multiple)
							b.removeSelection(value);
					}
					//select it
					else
						b.addSelection(value);

					//close menu
					b.close();
				});
				//on space or enter
				_bind(option, 'keyup', function(e){
					e.stopPropagation();
					var key = e.keyCode;

					//treat space and enter as clicks
					if(key === 13 || key === 32)
						return option.click();
				});
			});

			//toggle the open/closed state
			_bind(container, 'click', function(e){
				e.preventDefault();

				//we are opening
				if(!_hasClass(this, 'is-open'))
					b.open();
				//we are closing
				else
					b.close();
			});
			_bind(container, 'keyup', function(e){
				var key = e.keyCode;

				//open a menu if enter or space is pressed
				if(!_hasClass(this, 'is-open') && (key === 13 || key === 32))
					return b.open();
				//close a menu if esc is pressed
				else if(_hasClass(this, 'is-open') && key === 27)
					return b.close();
			});

			if(b.settings.search)
			{
				//our search field
				_bind(searchField, 'keyup', function(e){
					e.stopPropagation();
					var key = e.keyCode,
						textTest = _sanitizeRegexp(searchField.textContent.trim()),
						options = $$('.blobselect-item', searchField.parentNode.parentNode),
						matches = 0;

					//look for matches
					_forEach(options, function(option){
						var textOption = option.textContent.trim(),
							matchNew = !textTest.length || RegExp(textTest, "i").test(textOption),
							matchOld = !_hasClass(option, 'is-not-match');

						//get rid of old matches
						option.textContent = textOption;

						//update no-match status
						if(matchNew && !matchOld)
							_removeClass(option, 'is-not-match');
						else if(!matchNew && matchOld)
							_addClass(option, 'is-not-match');

						//update yes-match status
						if(_hasClass(option, 'is-not-match') && _hasClass(option, 'is-match'))
							_removeClass(option, 'is-match');
						else if(!_hasClass(option, 'is-not-match') && !_hasClass(option, 'is-match'))
							_addClass(option, 'is-match');

						if(matchNew)
							option.innerHTML = textOption.replace(RegExp(textTest, "gi"), "<mark>$&</mark>");

						if(matchNew)
							matches++;
					});

					//no matches? treat it like they aren't searching for anything
					if(!matches)
					{
						_forEach($$('.is-not-match', searchField.parentNode.parentNode), function(option){
							_removeClass(option, 'is-not-match');
						});
					}

					//if someone hits enter, treat it like we're clicking the first match
					if(key === 13)
					{
						var first = $('.blobselect-item.is-match', searchField.parentNode.parentNode);
						if(first !== null)
							first.click();
						else
							b.close();
					}
					//if someone hits escape, close it
					else if(key === 27)
						b.close();
				});
				//we want to allow clicks
				_bind(searchField, 'click', function(e){
					e.stopPropagation();
				});
			}

			//let it be known we've built things, great things
			b.status = 1;
			b.element.setAttribute('data-blobselected', 1);
		},

		//-------------------------------------------------
		// destroy blobSelect
		//
		// remove the elements we've created so the
		// select goes back to normal.
		//
		// @param n/a
		// @return n/a
		destroy: function(){
			var b = this;

			var container = b.element.parentNode;
			container.parentNode.insertBefore(b.element, container);
			_removeElement($$('.blobselect', container.parentNode));
			b.element.setAttribute('data-blobselected', 0);
		},

		//-------------------------------------------------
		// open menu
		//
		// @param n/a
		// @return n/a
		open: function(){
			var b = this,
				container = this.element.parentNode;	//the container element

			//if this is already open, ignore
			if(_hasClass(container, 'is-opening') || _hasClass(container, 'is-open'))
				return true;

			_forEach($$('.blobselect.is-open'), function(select){
				_removeClass(select, 'is-open');
			});

			_addClass(container, 'is-opening');
			setTimeout(function(){
				_addClass(container, 'is-open');
				_removeClass(container, 'is-opening');

				if(b.settings.search === true)
				{
					setTimeout(function(){
						$('.blobselect-item-search', b.element.parentNode).textContent = $('.blobselect-item-search', b.element.parentNode).textContent.replace('/\s/g', ' ').trim();
						$('.blobselect-item-search', b.element.parentNode).focus();
					}, 100);
				}
			}, 50);

		},

		//-------------------------------------------------
		// close menu
		//
		// @param n/a
		// @return n/a
		close: function(container){
			var container = this.element.parentNode;
			_removeClass(container, 'is-open');
			container.focus();
		},

		//-------------------------------------------------
		// update selections
		//
		// @param n/a
		// @return n/a
		updateSelections: function(){
			var b = this;

			//updateLock is used to prevent multiple
			//iterations stepping over each other
			if(b.updateLock)
				return;

			//lock it
			b.updateLock = true;

			//make sure this is blobselected
			if(!_hasClass(b.element.parentNode, 'blobselect'))
				return;

			//reset selections
			b.selections = [];
			_forEach($$('option', b.element), function(option){
				if(option.selected)
					b.selections.push(option.value);
			});

			//get rid of selection(s)
			var s = $('.blobselect-selections', b.element.parentNode);
			while(s.firstChild)
				s.removeChild(s.firstChild);

			//add selection(s)
			_forEach(b.selections, function(selection){
				var s = document.createElement('div');
					s.setAttribute('class', 'blobselect-selection');
					s.setAttribute('data-value', selection);
					if(!selection.trim().length || selection.trim().toLowerCase() === b.settings.placeholder.toLowerCase())
						_addClass(s, 'is-placeholder');
					s.textContent =  b.options[selection];

				//for multi-selects, clicking a selection de-selects it
				if(b.multiple)
				{
					_bind(s, 'click', function(e){
						e.stopPropagation();
						b.removeSelection(s.getAttribute('data-value'));
					});
				}

				$('.blobselect-selections', b.element.parentNode).appendChild(s);
			});

			//also update our pseudo-menus
			_forEach($$('.blobselect-item', b.element.parentNode), function(element){
				var selected_now = b.selections.indexOf(element.getAttribute('data-value')) !== -1,
					selected_then = _hasClass(element, 'is-active');
				if(selected_now && !selected_then)
					_addClass(element, 'is-active');
				else if(!selected_now && selected_then)
					_removeClass(element, 'is-active');
			});

			//manually fire "change" event if the values have, well, changed
			if(JSON.stringify(b.previous) !== JSON.stringify(b.selections))
			{
				var event = document.createEvent("UIEvents");
				event.initUIEvent("change", true, true, window, 1);
				b.element.dispatchEvent(event);
				b.previous = b.selections;
			}

			//unlock it
			b.updateLock = false;
		},

		//-------------------------------------------------
		// deselect something
		//
		// @param option value
		// @return true/false
		removeSelection: function(value){
			var b = this
				option = b.getOptionByValue(value);

			if(option !== false)
			{
				option.selected = 0;
				b.updateSelections();
				return true;
			}

			return false;
		},

		//-------------------------------------------------
		// select something
		//
		// @param option value
		// @return true/false
		addSelection: function(value){
			var b = this,
				option = b.getOptionByValue(value),
				selected = b.element.selectedIndex;

			if(option !== false)
			{
				if(b.multiple)
					option.selected = 1;
				else
					b.element.selectedIndex = option.index;

				b.updateSelections();
				return true;
			}

			return false;
		},

		//-------------------------------------------------
		// get option by value
		//
		// @param value
		// @return element or false
		getOptionByValue: function(value){
			var b = this,
				option = false;

			_forEach($$('option', b.element), function(element){
				if(element.value === value)
					option = element;
			});

			return option;
		},

		//-------------------------------------------------
		// sort options
		//
		// this rearranges the original <option> tags
		// based on their labels.  blobSelect's fake menu
		// will then be based on the re-ordered version.
		//
		// @param n/a
		// @return n/a
		sortOptions: function(){
			var options = $$('option', this.element);

			if(this.settings.orderType.toLowerCase() === 'string')
				options.sort(this.sortByString);
			else if(this.settings.orderType.toLowerCase() === 'numeric')
				options.sort(this.sortByNumber);

			if(this.settings.order.toUpperCase() === 'DESC')
				options.reverse();

			_forEach(options, function(option){
				option.parentNode.appendChild(option);
			});
		},

		//by string
		sortByString: function(a, b){
			return a.textContent.trim().toLowerCase().localeCompare(b.textContent.trim().toLowerCase());
		},

		//by number
		sortByNumber: function(a, b){
			//not perfect, but try to strip out non-number things
			var av = Number(a.textContent.replace(/[^\d\.]/g, '')),
				bv = Number(b.textContent.replace(/[^\d\.]/g, ''));
			//if that gives us non-numeric values, zero them
			if(isNaN(av))
				av = 0;
			if(isNaN(bv))
				bv = 0;

			return av - bv;
		}

	}

	//---------------------------------------------------------------------
	// Initialization
	//---------------------------------------------------------------------

	//-------------------------------------------------
	// Init
	//
	// @param n/a
	// @return n/a
	function init(){
		_forEach($$('select[data-blobselect]'), function(select){
			new blobSelect(select);
		});
	}

	try {
		//run when DOM is done
		document.addEventListener("DOMContentLoaded", init);
	} catch(e){ }

})();