!function (global, $) {
    "use strict";

    //A popover which works to deliver any content delivered
    //to it, an extention of Bootstrap Popover
    var PopoverContainer = function (element, options) {
        this.boundaryGutter = 5;
        if (options.boundary) {
            this.boundary = options.boundary;
        } else {
            this.boundary = null;       //Element which defines the horizontal extents of
            //the popover
        }

        this.init('popoverContainer', element, options);
    };

    PopoverContainer.prototype = $.extend({}, $.fn.popover.Constructor.prototype, {

        constructor:PopoverContainer, setContent:function () {
            var $tip = this.tip()
                , content = this.getContent();

            //First, clear the popover
            $tip.find('.popover-inner').html("");

            //Then set the new contents to the package contents
            $tip.find('.popover-inner').append(content);
            $tip.removeClass('fade top bottom left right in');
        }
        //Instead of getting the content from the element
        //the content is generated using the provided content
        //function
        , getContent:function () {
            var content
                , $e = this.$element
                , o = this.options;

            content = (typeof o.content == 'function' ? o.content.call($e[0]) : o.content);

            return content;
        }, tip:function () {
            if (!this.$tip) {
                this.$tip = $(this.options.template)
            }
            return this.$tip
        }, checkBoundaries:function (boundary) {

            $(this.tip()).css("top", parseInt($(this.tip()).css("top"))-5 + "px");
            //move popover up 5px

            if (boundary) this.boundary = boundary;
            //Check if a boundary has been defined
            //If so, determine whether it has been
            //violated
            if (this.boundary) {
                var bound_left = $(this.boundary).offset().left;
                var bound_width = $(this.boundary).width();
                var bound_right = bound_left + bound_width;

                var tip_left = $(this.tip()).offset().left;
                var tip_width = $(this.tip()).width();
                var tip_right = tip_left + tip_width;

                var left_checks = true;
                var right_checks = true;

                //Check for overhang
                if (tip_left < bound_left) {
                    left_checks = false;
                }
                if (tip_right > bound_right) {
                    right_checks = false;
                }

                //Fix the overhang but only on one side
                //If there is overhang on both sides
                //the developer will have to resolve this
                if (!left_checks) {
                    var overhang = bound_left - tip_left + this.boundaryGutter;
                    var overhangPercent = overhang / tip_width;
                    var newArrowPercent = 0.5 - overhangPercent;
                    var newPopoverPosition = tip_left + overhang;

                } else if (!right_checks) {
                    var overhang = tip_right - bound_right + this.boundaryGutter;
                    var overhangPercent = overhang / tip_width;
                    var newArrowPercent = 0.5 + overhangPercent;
                    var newPopoverPosition = tip_left - overhang;
                }

                $(this.tip()).css("left", newPopoverPosition);
                $(this.tip()).find(".arrow").css("left", parsePercentage(newArrowPercent));

            }
        }
    });

    /* POPOVER CONTAINER PLUGIN DEFINITION
     * ================================ */

    $.fn.popoverContainer = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('popoverContainer')
                , options = (typeof option == 'object' && option);
            if (!data) $this.data('popoverContainer', (data = new PopoverContainer(this, options)));
            if (typeof option == 'string') data[option]();
        });
    };

    $.fn.popoverContainer.Constructor = PopoverContainer;

    $.fn.popoverContainer.defaults = $.extend({}, $.fn.popover.defaults, {
        placement:'right', trigger:'click', content:'', template:'<div class="popover"><div class="arrow"></div><div class="popover-inner"></div></div>', boundaryGutter:5
    });

    //TODO: Move into seperate file




    /* POPOVER MANAGER
     * ============= */

     // USAGE
     // Use popover manager when you have a controller which
     // manages one or more popovers

     // 1. Initialize the Popover Manager with the global options you want
     // 2. Call show popover with at least the following information:
     //     i.      popoverID: A unique id for a particular popover.
     //     ii.     owner: element selector the popover should attach itself to
     //     iii.    content: A function which returns a dom element (popover contents)
     //             (may be specified in manager constructor )
     //             This function will be provided with the popover object as the
     //             first argument when called, giving access to more advanced
     //             features. (e.g. dismiss popover using button inside of popover)
    function PopoverManager(options) {
        this.defaults = {
            trigger:    options.trigger,
            placement:  options.placement,
            boundary:   options.boundary,
            content:    options.content
        };

        //OPTION: Mode
        //Mode determines how the manager deals with multiple popovers
        if(!options.mode) {
            options.mode = PopoverManager.MODES["defaultValue"];
        }
        this.mode = options.mode;
        this.multipleShowBehavior = PopoverManager.MULTIPLE_SHOW_REQUEST_BEHAVIORS["defaultValue"];

        var dismissOnTemplate = {
                outside: {
                    click: true,
                    scroll: true
                },
                inside:  {
                    click: false,       //NO IMPLEMENTATION YET
                    scroll: false       //NO IMPLEMENTATION YET
                },
                timeout: {
                    bool: true,
                    duration: 8000
                }
        };

        if(!options.dismissOn) {
            options.dismissOn = {};
        }

        //Combine the defaults for DismissOn with the options provided
        $.extend(true, dismissOnTemplate, options.dismissOn);
        this.dismissOn = dismissOnTemplate;

        //TIMEOUTS
        this.clickCaptureTimeout = null;

        //Active ID of the popover to display
        this.activeID = null;

        //Tracks the popovers created
        this.popovers = {};
        this.count = {
            open:       0,
            managed:    0
        };
    };

    //Enum: PopoverManager Modes
    PopoverManager.MODES = {
        radio: 0,   //Only one popover showing at a time
        multi: 1,   //Popovers must be toggled explicitly
        defaultValue: 0  //Radio
    };

    //Enum: Multiple show request behaviors
    //When attempting to open an already open popover...
    PopoverManager.MULTIPLE_SHOW_REQUEST_BEHAVIORS = {
        nothing: 0, //Do nothing if already open
        toggle:  1, //Toggle the popover closed
        defaultValue: 1
    }

    //Struct holding all the popover data
    function PopoverController(id, options, manager) {
        this.id              = id;
        this.options         = options;
        this.open            = false;
        this.manager         = manager;

        if(!options.clickableSet) {
            options.clickableSet = [];
        }


        this.selectors = {
            owner: options.owner,   //The object on which the popover is triggered
            popover: null,          //The popover element itself
            clickableSet: options.clickableSet  //The clickable elements (which will not dismiss the popover)
        };

        this.scrollDismissEvent = null; //The dismissal event, used to allow
                                        //the subscription to be revoked

        this.launchTimeout = null;
    };

    //Give the popover the ability to dismiss itself
    PopoverController.prototype.dismiss = function() {
        this.manager.hidePopover(this.id);
    }
    PopoverController.prototype.hide = PopoverController.prototype.dismiss;



    //Shows a popover with the given id, creating it if needed
    //Also verifies whether it needs to close other popovers
    PopoverManager.prototype.showPopover = function(popoverID, options) {
        var self = this;

        //Ensure that all the options are set
        //and set to default if not
        options = this.optionsCheckSetDefaults(options);
        var popover = this.getPopover(popoverID);
        if(!popover) {
            popover = this.createPopover(popoverID, options);
        }


        //Opens the popover and increments the open count
        if(this.checkShouldDisplay(popoverID)) {

            //If only one popover at a time is allowed to be opened, close the others
            if(this.mode == PopoverManager.MODES["radio"]) {
                this.hideAllPopovers();
            }

            //DISPLAY THE POPOVER
            $(popover.selectors.owner).popoverContainer("show");


            //Check to conform to boundaries
            try {
                $(popover.selectors.owner).popoverContainer("checkBoundaries");
            }
            catch (err) { 
                console.log("Failed to check boundaries on popover: " + popover.id + ". Error: " + err);
            }

            //Update some tracking data
            this.count.open++;
            popover.open = true;
            this.activeID = popoverID;

            //Ensure the clickable areas are set
            var clickableSet = popover.selectors.clickableSet;
            clickableSet.push(".popover-inner");
            clickableSet.push(popover.selectors.owner);

            //DISMISSAL CASES
            //-------------------------------

            //OUTSIDE SCROLL
            if(popover.options.dismissOn.outside.scroll) {
                this.subscribeScrollDismissal(popoverID);
            }

            //OUTSIDE CLICK
            if(popover.options.dismissOn.outside.click) {
                this.clickCaptureTimeout = setTimeout(function() {
                    enableGlobalClickCapturing(clickableSet, null, function(){
                            self.hideAllPopovers();
                    });
                }, 200);
            }

            //TIMEOUT
            if(popover.options.dismissOn.timeout.bool) {
                popover.launchTimeout = setTimeout(function() {
                    self.hidePopover(popoverID);
                }, this.dismissOn.timeout.duration);
            }
        } else {
            //If display was rejected, it may be necessary to toggle
            if(this.multipleShowBehavior == PopoverManager.MULTIPLE_SHOW_REQUEST_BEHAVIORS["toggle"]) {
                if(popover.open) {
                    this.hidePopover(popoverID);
                }
            }
        }
    };

    //Subscribe the dismiss on scroll event
    PopoverManager.prototype.subscribeScrollDismissal = function(popoverID) {
        var popover = this.getPopover(popoverID);
        var self = this;

        if(popover) {
            //If there is an active subscription, dispose of it
            if(popover.scrollDismissEvent) {
                this.unsubscribeScrollDismissal(popoverID);
            }

            //Create the event
            popover.scrollDismissEvent = function() {
                self.hidePopover(popoverID);
            }

            //Bind the event
            $(document).bind("scroll", popover.scrollDismissEvent);
        }
    };

    //Unsubscribe the dismiss on scroll event
    PopoverManager.prototype.unsubscribeScrollDismissal = function(popoverID) {
        var popover = this.getPopover(popoverID);

        //If the popover is valid and has an active event
        //unsubscrive it
        if((popover)&&(popover.scrollDismissEvent)) {
            $(document).unbind("scroll", popover.scrollDismissEvent);
        }

        popover.scrollDismissEvent = null;
    }

    //Hides the specified popover
    PopoverManager.prototype.hidePopover = function(popoverID) {
        var popover = this.getPopover(popoverID);
        if((popover)&&(popover.open)) {
            $(popover.selectors.owner).popoverContainer('hide');    // Hide the popover on the DOM
            this.unsubscribeScrollDismissal(popoverID);             // Unbind the scroll event
            this.count.open--;                                      // Decrement the count of open popovers
            popover.open = false;                                   // Set the popover state to closed
            if(this.activeID == popover.id) {                       // Unset the popover as the active one, if it is
                this.activeID = null;
            }
            //Cleanup timeouts
            if(this.clickCaptureTimeout) {
                clearTimeout(this.clickCaptureTimeout);
                this.clickCaptureTimeout = null;
            }
            if(popover.launchTimeout) {
                clearTimeout(popover.launchTimeout);
                popover.launchTimeout = null;
            }

            disableGlobalClickCapturing();                          // Stop globally capturing clicks
        }
    }

    PopoverManager.prototype.hideAllPopovers = function() {
        var propertyName;
        for(propertyName in this.popovers){
            if(this.popovers.hasOwnProperty(propertyName)){
                this.hidePopover(propertyName);
            }
        }
    }

    PopoverManager.prototype.checkShouldDisplay = function(popoverID) {
        var shouldDisplay = false;

        if(popoverID == this.activeID) {
            if(this.mode == PopoverManager.MODES["multi"]) {
                shouldDisplay = true;
            }
        } else {
            shouldDisplay = true;
        }

        return shouldDisplay;
    }

    //Checks if an option is set, otherwise sets it to default
    //Also merges the options for the popover manager onto the popover
    //options, so that individual popovers can override the global
    //behaviors
    PopoverManager.prototype.optionsCheckSetDefaults = function(options) {

        if(!options) {
            var options = {};
        }

        var newOptions = {};

        $.extend(true, newOptions, this.defaults, {
            dismissOn: this.dismissOn
        }, options);

        return newOptions;
    }

    //Checks if the popover has already been created. If not,
    //it returns null
    PopoverManager.prototype.getPopover = function(id) {
        var result = null;
        if(this.count.managed > 0) {
            if(this.popovers[id]) {
                result = this.popovers[id];
            }
        }
        return result;
    }

    //Creates a new popover based on the parameters given
    //Destroys any previous popover with the given id
    PopoverManager.prototype.createPopover = function(id, options) {
        var popover = new PopoverController(id, options, this);

        //If a popover with this id already exists, destroy it
        this.destroyPopover(id);

        //Register the popover
        this.popovers[id] = popover;
        this.count.managed++;

        //Wrap the popover content function
        //to enable access to the popover itself
        var _inner_content = popover.options.content;
        popover.options.content = function() {
            return _inner_content(popover);
        }

        $(popover.selectors.owner).popoverContainer(popover.options);

        return popover;

    }

    PopoverManager.prototype.destroyPopover = function(id){
        //Verify the popover exists
        var popover = this.popovers[id]
        if(popover) {
            //Decrement the open count
            this.hidePopover(id);

            //Decrement the count for managed popovers
            this.count.managed--;
            this.popovers[id] = null;
        }
    }

    PopoverManager.prototype.destroyAllPopovers = function() {
        var popover;
        for(popover in this.popovers){
            if(this.popovers.hasOwnProperty(popover)){
                this.destroyPopover(popover);
            }
        }
    }


    PopoverManager.prototype.destroyActivePopover = function() {
        this.destroyPopover(this.activeID);
    }

    //Expose the object to the global scope
    global.PopoverManager = PopoverManager;
}(window, window.jQuery);
