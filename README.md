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
   * [Repaint](#repaint)
4. [Styling](#styling)
5. [License](#license)


&nbsp;

## Features

blob-select has feature parity with the standard `<select>`, `<option>`, and `<optgroup>` attributes, including:
* `<select multiple=multiple>`
* `<select disabled=disabled>`
* `<optgroup disabled=disabled>`
* `<option disabled=disabled>`

blob-select additionally provides support for:
* Placeholders
* Searching
* Sorting


&nbsp;

## Requirements

blob-select does not require any specialJavascript frameworks. It is compatible with all major modern browsers and IE 11.

&nbsp;

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
A single HTML attribute with chosen settings as a stringified object,
e.g. JSON.
Note: if present, individual HTML attributes (see below) take priority.
-->
<select data-blobselect='{"foo" : "bar", ...}'></select>

<!--
Individual HTML attributes.
Format like: data-blobselect-{de-camelCased property name}
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

| Type     | Key               | Default | Description |
| -------- | ----------------- | ------- | ----------- |
| *string* | **orderType** | `""` | How to compare option labels for sorting; either `"string"`, `"numeric"`, or empty to not sort. |
| *string* | **order** | `"asc"` | Sort order (if **orderType** is specified); `"asc"` or `"desc"`. |
| *string* | **placeholder** | `"---"` | Selected text to display when a "placeholder" `<option>` is selected. Placeholderness is `TRUE` when an `<option>` has no label or has an attribute `data-placeholder="1"`.
| *string* | **placeholderOption** | `"---"` | Same as above, except this text is used only for the dropdown listing. If omitted, the *placeholder* setting will supply both. |
| *bool* | **search** | `FALSE` | Whether or not to display a simple search field in the dropdown. The search field itself is a contentEditable `<div>` so as not to screw up your real `<form>`.
| *int* | **watch** | `0` | This forces `blob-select` to re-check for changes to its element every *X* milliseconds. This option is useful when other scripts might manipulate the element without firing a `change` event. Otherwise, leave this disabled to spare the unnecessary overhead. |



### Initialization

blob-select will automatically initialize any `<select>` elements on `DOMContentLoaded` that contain a `data-blobselect*` attribute. Alternatively, you can manually initialize an element at any time as follows:

```javascript
// Regular ol' JS.
document.getElementById('my-select').blobSelect.init({...});

// jQuery example.
$('#my-select')[0].blobSelect.init({...});
```


### Destruction

To restore your page to its natural state, simply run:

```javascript
document.getElementById('my-select').blobSelect.destroy();
```


### Repaint

`blob-select` will automatically listen for `change` events, but some Javascript frameworks might write changes without firing an event. There are two workarounds for this:

**watch**:

Set the `watch` runtime property on the field. This will add a `setInterval()` trigger to the mix, rechecking the DOM every `X` millseconds for changes (and rebuilding as necessary).

```html
<!-- Will look for changes every half-second. -->
<select data-blobselect-watch="500">...</select>
```

**element.blobSelect.buildData()**:

Call the `.buildData()` method after such changes have landed.

```javascript
// Place this after secret, non-event-firing changes have run.
document.getElementById('my-select').blobSelect.buildData();
```


&nbsp;

## Styling

blob-select aims to be as headache-free as possible. Its markup is minimal (see below) and it does not impose pesky inline styles, Javascript animations, or convoluted nested>nested>nested elements. Frontend developers are free to define everything through elegant CSS wizardry.

The HTML structure is as follows:

```html
<!--
.blobselect: the main container (don't add this class to your SELECT)
.is-multiple: if the select allows multiple values
.is-open: if the dropdown is open
.is-opening: a transitional class to allow you to e.g. animate from display: none
.is-disabled: if the select has the disabled attribute
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
        .is-disabled: if the option (or its optgroup parent) has the disabled attribute
        .is-focused: if the option has focus via e.g. keyboard navigation
        .has-group: if the option is part of an optgroup
        .is-match: if "search"=true and this option matches the search
        .is-not-match: if "search"=true and this option does not match the search

        NOTE: a matched search substring will be wrapped in <mark> tags
            e.g. Op<mark>tion</mark> Label
        -->
        <div class="blobselect-item" data-value="option value" data-label="Option Label">Option Label</div>
        
        <!--
        .blobselect-item-group: an optgroup
        .is-disabled: if the optgroup has the disabled attribute
        -->
        <div class="blobselect-item-group">Fruit</div>
    </div>
</div>
```

The SCSS project folder includes example styles that might provide some inspiration.


&nbsp;

## License

Copyright © 2018 [Blobfolio, LLC](https://blobfolio.com) &lt;hello@blobfolio.com&gt;

This work is free. You can redistribute it and/or modify it under the terms of the Do What The Fuck You Want To Public License, Version 2.

    DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
    Version 2, December 2004
    
    Copyright (C) 2004 Sam Hocevar <sam@hocevar.net>
    
    Everyone is permitted to copy and distribute verbatim or modified
    copies of this license document, and changing it is allowed as long
    as the name is changed.
    
    DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
    TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION
    
    0. You just DO WHAT THE FUCK YOU WANT TO.

### Donations

<table>
  <tbody>
    <tr>
      <td width="200"><img src="https://blobfolio.com/wp-content/themes/b3/svg/btc-github.svg" width="200" height="200" alt="Bitcoin QR" /></td>
      <td width="450">If you have found this work useful and would like to contribute financially, Bitcoin tips are always welcome!<br /><br /><strong>1Af56Nxauv8M1ChyQxtBe1yvdp2jtaB1GF</strong></td>
    </tr>
  </tbody>
</table>
