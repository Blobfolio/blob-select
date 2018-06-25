# blob-select

A dependency-free Javascript plugin for styling `<select>` elements with an emphasis on markup simplicity and performance.

Note: For projects built with the [Vue.js](https://vuejs.org/) framework, the [vue-blob-select](https://github.com/Blobfolio/vue-blob-select) fork might be a better fit.



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

blob-select is written in pure Javascript and does not depend on any third-party frameworks.

It is compatible with all major modern web browsers, and ~~the browser that just won't die~~ IE 11.

This plugin does make use of some ES6 markup like `let` and `const`. If your project needs to support *old* browsers, you will need to first transpile `blobselect.min.js` to ES5 with a tool like [Babel](https://babeljs.io/), then serve that copy to visitors.



&nbsp;

## Use


### Installation

Download `dist/blobselect.min.js` and add it to your project folder, and include it somewhere on the page.

```html
<script src="/path/to/blobselect.min.js"></script>
```

The `dist/` folder also includes an example stylesheet and icon for the search bar to help get you started. Of course, you can also write styles from scratch; the generated markup is pretty straight-forward. :)



### Configuration

blob-select includes a few choice functional enhancements to the standard `select` browser object, but does not attempt to introduce every feature ever dreamt of by (wo)man or beast. These settings can be defined for each element in either of three ways:

```html
<!--
  Pass all options in JSON format via a data-blobselect
  attribute. More specific attributes (see below), if
  present, take priority.
-->
<select data-blobselect='{"foo" : "bar", …}'></select>

<!--
  Pass individual options via kabob-case data attributes.
  For example, set "orderType" via
  data-blobselect-order-type="…".
-->
<select data-blobselect-foo="bar"></select>

<!--
  Alternatively, you can set elements in Javascript when
  calling the constructor.
-->
<script>
    document.getElementById('my-select').blobSelect({
        foo : "bar",
        …
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
document.getElementById('my-select').blobSelect.init({…});

// jQuery example.
$('#my-select')[0].blobSelect.init({…});
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
<select data-blobselect-watch="500">…</select>
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
  .blobselect: The main container.

    &.is-multiple: If the <select> is [multiple].

    &.is-open: The dropdown is open.

    &.is-opening: The dropdown is opening. This is a quick
    transitional class that exists solely to allow you to
    do things like animate from display:none.

    &.is-disabled: The <select> is disabled.

  Note: Do not add any of these classes manually.
-->
<div class="blobselect">

    <!--
      .blobselect-selections: Selection(s) container.
    -->
    <div class="blobselect-selections">
    
        <!--
          .blobselect-selection: A single section.

            &.is-placeholder: The "selected" item is a
            placeholder.

          Note: [multiple] selects can have more than one
          .blobselect-selection.
        -->
        <div class="blobselect-selection" data-value="apples" data-label="Apples">Apples</div>
    </div>
    
    <!-- The original <select> is now here. -->
    <select name="foobar" id="foobar" class="foobar">…</select>

    <!--
      .blobselect-button: This is a superfluous element to
      help you draw something like a button. The example
      CSS uses :after to make a triangle.

      Note: Click events are bound to the entire
      .blobselect container, so if you don't need this, you
      can display:none it to get it out of your hair.
    -->
    <div class="blobselect-button"></div>

    <!--
      .blobselect-items: The styleable dropdown.
    -->
    <div class="blobselect-items">
    
        <!--
          .blobselect-item-search: A search field to filter
          visible items. This is only present when the
          option { search: true } is set.

          Note: So as not to interfere with <form> data,
          this is a contentEditable <div>. Of course it can
          and/or should be styled to *look* like a regular
          text <input>, but this way no data will be sent
          back to the server. Neat, huh?
        -->
        <div class="blobselect-item-search" type="text" contenteditable="true"></div>

        <!--
          .blobselect-item: A single option.
            
            &.is-active: This option is selected.
            
            &.is-placeholder: This is just a placeholder.
            
            &.is-disabled: The <option> or its <optgroup>
            are disabled.
            
            &.is-focused: The <option> has focus. This is
            intended to aid with keyboard-based navigation.
            
            &.has-group: This <option> is part of an
            <optgroup>.
            
            &.is-match: A search/filter matches this
            <option>.
            
            &.is-not-match: A search/filter does not match
            this <option>. Generally you would want to use
            this to display:none unwanted items.

          NOTE: When a search/filter is applied, partial
          matches are wrapped in <mark> tags. You can style
          that with e.g. .blobselect-item > mark { … }
        -->
        <div class="blobselect-item" data-value="option value" data-label="Option Label">Option Label</div>
        
        <!--
          .blobselect-item-group: An <optgroup> label.
          
            &.is-disabled: The <optgroup> is disabled.
        -->
        <div class="blobselect-item-group">Fruit</div>
    </div>
</div>
```

The SCSS source folder includes example styles that should provide a starting point and/or inspiration. :)



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
