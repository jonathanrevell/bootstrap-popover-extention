Bootstrap Popover Extention
===========================
''By JonathanRevell''

Extension to Bootstrap's popovers which allows for boundary detection, and direct view embedding.

Installation
=============

You must have [Twitter's Bootstrap](http://twitter.github.com/bootstrap/) installed already with the ''tooltip'' extention.

Simply copy the file into your project and make sure it is included/executed ''after'' bootstrap.


Configuration
=============

Using the popover is similar to bootstrap's own popover. The popover included with this is "PopoverContainer", and should be referenced accordingly.


Embedding a View
----------------

The popover expects to receive a ''package'' jQuery object containing the set of elements. Ideally you would create a div, fill it with the other elements, and then pass that element to the popover
