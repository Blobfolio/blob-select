# blob-select

A dependency-free Javascript plugin for styling `<select>` elements with an emphasis on markup simplicity and performance.



##### Table of Contents

1. [Features](#features)
2. [Requirements](#requirements)
3. [Use](#use)
  * [Installation](#installation)
  * [Configuration](#configuration)
  * [Initialization](#initialization)
  * [Destruction](#destruction)
4. [Styling](#styling)
5. [License](#license)



## Features

blob-select has feature parity with the standard `<select>`, `<option>`, and `<optgroup>` attributes, including:
* `<select multiple=multiple>`
* `<option disabled=disabled>`

blob-select additionally provides support for:
* Placeholders
* Searching
* Sorting



## Requirements

blob-select does not require any Javascript frameworks, however browsers must support the following:
* [classList](http://caniuse.com/#feat=classlist)
* [querySelector](http://caniuse.com/#feat=queryselector) + [querySelectorAll](http://caniuse.com/#feat=queryselector)
* [JSON](http://caniuse.com/#search=JSON)

Broadly, this means all modern browsers are supported, and IE 10+. If these requirements are not met, blob-select will exit without manipulating the DOM.



## Use


### Installation

Download `dist/js/blobselect.min.js` and add it to your project folder, and include it somewhere on the page.

```html
<script src="/path/to/blobselect.min.js"></script>
```

Or via Composer:
```bash
composer require "blobfolio/blob-select:dev-master"
```

Or via Bower:
```bash
bower install blob-select
```


### Configuration

blob-select includes a few choice functional enhancements to the standard `select` browser object, but does not attempt to introduce every feature ever dreamt of by (wo)man or beast. These settings can be defined for each element in either of three ways:

```html
<!--
a single HTML attribute with chosen settings in a (valid!) JSON string
Note: the ' and " ordering
Note: if present, individual HTML attributes (see below) will be ignored
-->
<select data-blobselect='{"foo" : "bar", ...}'></select>

<!--
individual HTML attributes
format like: data-blobselect-{de-camelCased property name}
    e.g. set orderType via data-blobselect-order-type="..."
-->
<select data-blobselect-foo="bar"></select>

<!-- via Javascript -->
<script>
    document.getElementById('my-select').blobSelect({
        foo : "bar",
        ...
    });
</script>
```

The following settings are available:

> (*string*) **orderType**
> To have blob-select sort your `<option>`s, use *"string"* or *"numeric"* (according to the kind of data you're presenting). Otherwise, with the exception of "placeholders" (which always bubble to the top), ordering will be left alone.
> Default: *null*

> (*string*) **order**
> This option determines the sort order, either *"asc"* or *"desc"*. If *orderType* is not set, this option is ignored.
> Default: *"asc"*

> (*string*) **placeholder**
> This option overrides the text displayed when a "placeholder" `<option>` is selected. Any `<option>` without a label or with the attribute `data-placeholder="1"` is considered a "placeholder".
> Default: *"---"*

> (*string*) **placeholderOption**
> This works just like *placeholder*, but overrides the text displayed in the dropdown. If omitted, the *placeholder* setting will supply both.
> Default: *"---"*

> (*bool*) **search**
> To add a simple search field to the dropdown, set this value to *true*.
> Note: so as not to screw up your `<form>`, the search field is actually a contenteditable `<div>`.
> Default: *false*

> (*int*) **watch**
> This option will cause blob-select to manually re-examine your `<select>` element every *X* milliseconds to see if something has changed (and redraw itself as necessary).
> Note: this option should only be used in situations where element state changes are happening in hacky ways (like with AngularJS models). So long as outside scripts fire a `change` event, this is not needed.
> Default: *0* (i.e. disabled)

> (*bool*) **debug**
> When *true*, a lot of operational information is dumped to the console.log().
> Default: *false*


### Initialization

blob-select will automatically initialize any `<select>` elements on `DOMContentLoaded` that contain a `data-blobselect*` attribute. Alternatively, you can manually initialize an element at any time as follows:

```javascript
//regular ol' JS
document.getElementById('my-select').blobSelect.init({...});

//jQuery example
$('#my-select')[0].blobSelect.init({...});
```


### Destruction

To restore your page to its natural state, simply run:

```javascript
document.getElementById('my-select').blobSelect.destroy();
```



## Styling

blob-select aims to be as headache-free as possible. Its markup is minimal (see below) and it does not impose pesky inline styles, Javascript animations, or convoluted nested>nested>nested elements. Frontend developers are free to define everything through elegant CSS wizardry.

The HTML structure is as follows:

```html
<!--
.blobselect: the main container (don't add this class to your SELECT)
.is-multiple: if the select allows multiple values
.is-open: if the dropdown is open
.is-opening: a transitional class to allow you to e.g. animate from display: none
-->
<div class="blobselect">

    <!-- .blobselect-selections: selection(s) wrapper -->
    <div class="blobselect-selections">
    
        <!--
        .blobselect-selection: a selection
        .is-placeholder: if the selection is a placeholder option
        Note: multiselects can have more than one .blobselect-selection
        -->
        <div class="blobselect-selection" data-value="apples" data-label="Apples">Apples</div>
    </div>
    
    <!-- the original select -->
    <select name="foobar" id="foobar" class="foobar"> ... </select>

    <!--
    .blobselect-button: an extra element in case you need more than
    a :after to achieve the desired styling. Note: click events are bound
    on the entire .blobselect container, so you don't have to use this
    -->
    <div class="blobselect-button"></div>

    <!--.blobselect-items: the "dropdown" -->
    <div class="blobselect-items">
    
        <!--
        .blobselect-item-search: only present if "search"=true
        Note: this is a contenteditable <div>, not a true <input>
        Note: type="text" is appended to help it inherit CSS [type="text"]
        styles, but is otherwise functionless
        -->
        <div class="blobselect-item-search" type="text" contenteditable="true"></div>

        <!--
        .blobselect-item: an option
        .is-active: if the option is selected
        .is-placeholder: if the option is a placeholder
        .is-disabled: if the option is disabled
        .is-focused: if the option has focus via e.g. keyboard navigation
        .has-group: if the option is part of an optgroup
        .is-match: if "search"=true and this option matches the search
        .is-not-match: if "search"=true and this option does not match the search

        NOTE: a matched search substring will be wrapped in <mark> tags
            e.g. Op<mark>tion</mark> Label
        -->
        <div class="blobselect-item" data-value="option value" data-label="Option Label">Option Label</div>
        
        <!-- .blobselect-item-group: an optgroup -->
        <div class="blobselect-item-group">Fruit</div>
    </div>
</div>
```

The SCSS project folder includes example styles that might provide some inspiration.



## License

Copyright © 2016 [Blobfolio, LLC](https://blobfolio.com) &lt;hello@blobfolio.com&gt;

This work is free. You can redistribute it and/or modify it under the terms of the Do What The Fuck You Want To Public License, Version 2.

    DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
    Version 2, December 2004
    
    Copyright (C) 2016 Sam Hocevar <sam@hocevar.net>
    
    Everyone is permitted to copy and distribute verbatim or modified
    copies of this license document, and changing it is allowed as long
    as the name is changed.
    
    DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
    TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION
    
    0. You just DO WHAT THE FUCK YOU WANT TO.