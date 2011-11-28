/* Copyright (c) 2006-2011 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the Clear BSD license.  
 * See http://svn.openlayers.org/trunk/openlayers/license.txt for the
 * full text of the license. */

/**
 * requires OpenLayers/Control/SelectFeature.js
 * requires OpenLayers/Lang.js
 * requires OpenLayers/Popup.js
 */

/**
 * Class: OpenLayers.Control.FeaturePopups
 * 
 * Inherits from:
 *  - <OpenLayers.Control>
 */
OpenLayers.Control.FeaturePopups = OpenLayers.Class(OpenLayers.Control, {

    /**
     * Supported event types:
     *  - *beforefeaturehighlighted* Triggered before a feature is highlighted.
     *  - *featurehighlighted* Triggered when a feature is highlighted.
     *  - *featureunhighlighted* Triggered when a feature is unhighlighted.
     *  - *featureselected* Triggered after a feature is selected.  Listeners
     *      will receive an object with a *feature* property referencing the
     *      selected feature, and *selectionBox* true if 
     *      feature is selected using a selection box.
     *  - *featureunselected* Triggered after a feature is unselected.
     *      Listeners will receive an object with a *feature* property
     *      referencing the unselected feature.
     *  - *beforeselectionbox* Triggered before beginning the selection 
     *      features marked with a selecection box. 
     *  - *afterselectionbox* Triggered after the selection all features marked 
     *      with a selecection box. Listeners will receive *count* with the 
     *      number of selected features.
     */

    /**
     * APIProperty: autoActivate
     * {Boolean} Activate the control when it is added to a map. Default is
     *     true.
     */
    autoActivate: true,
    
    /**
     * APIProperty: hover
     * {Boolean} Shows popup on mouse over feature and hides popup on mouse
     *      out. Hover popups are not affected by <closeBox> and <clickout> 
     *      options. Default is false.
     */
    hover: false,
    
    /**
     * APIProperty: closeBox 
     * {Boolean} Whether to display a close box inside the popup, default is
     *     false.
     */
    closeBox: false,
    
    /**
     * APIProperty: clickout
     * {Boolean} Close popup when clicking outside any feature,
     *     default is true, if <closeBox> is true default is false.
     */
    clickout: true,
    
    /**
     * APIProperty: selectionBox
     * {Boolean} Allow feature selection by drawing a box. Default is false.
     */
    selectionBox: false,
    
    /**
     * APIProperty: selectionBoxKeyMask
     * {Integer} Selection box only occurs if the keyMask matches the 
     *     combination of keys down. Use bitwise operators and one or more of
     *     the <OpenLayers.Handler> constants to construct a keyMask. Only used 
     *     when <selectionBox> is true.
     * NOTE: When MOD_CTRL is used the context menu is desabled.
     * Default is <OpenLayers.Handler.MOD_CTRL>.
     */
    selectionBoxKeyMask: OpenLayers.Handler.MOD_CTRL,

    /**
     * APIProperty: popupHoverClass
     * Default is OpenLayers.Popup.
     */
    popupHoverClass: null,
    
    /**
     * APIProperty: popupSelectClass
     * Default is OpenLayers.Popup.FramedCloud.
     */
    popupSelectClass: null,
    
    /**
     * APIProperty: popupListClass
     * Default is OpenLayers.Popup.FramedCloud.
     */
    popupListClass: null,
    
    /**
     * APIProperty: layerListFeaturesTemplate
     * Default is "<h2>${layer.name} - ${count}</h2><ul>${html}</ul>"
     */
    layerListFeaturesTemplate: "<h2>${layer.name} - ${count}</h2><ul>${html}</ul>",

    /**
     * APIProperty: hoverClusterTemplate
     * Default is "Cluster with ${cluster.length} features<br>on layer \"${layer.name}\"
     */
    hoverClusterTemplate: "${OpenLayers.i18n('Cluster with ${cluster.length} features<br>on layer \"${layer.name}\"')}",
    
    /**
     * Property: regExesI18n
     * {RegEx} Used to internationalize templates.
     */
    regExesI18n: /\$\{OpenLayers.i18n\(["']?([\s\S]+?)["']?\)\}/g,
    
    /**
     * Property: boxStarted
     * {Boolean} Internal use only.
     */
    boxStarted: false,    

    /**
     * Property: layerListeners
     * {Object} layerListeners object will be registered with 
     *     <OpenLayers.Events.on>, internal use only.
     */
    layerListeners: null,
    
    /**
     * Property: popupObjs
     * {Object} Internal use only.
     */
    popupObjs: null,

    /**
     * Property: controls
     * {Object} Internal use only.
     */
    controls: null,
    
    /**
     * Property: templates
     * {Object} stores templates of this control's layers, internal use only.
     */
    templates: null,
        
    /**
     * Property: layers
     * {Array(<OpenLayers.Layer.Vector>)} The layers this control will work on, 
     *     internal use only.
     */
    layers: null,
    
    /**
     * Constructor: OpenLayers.Control.FeaturePopups
     * TODO The control generates three types of popup: "hover", "select" and 
     *     "list". 
     * Each popup has a displayClass according to their type: 
     *     "[displayClass]_hover" ,"[displayClass]_select" and 
     *     "[displayClass]_list" respectively.
     * 
     * options - {Object} 
     */
    initialize: function (options) {
        options = OpenLayers.Util.extend({
                clickout: !options.closeBox,
                popupHoverClass: OpenLayers.Popup,
                popupSelectClass: OpenLayers.Popup.FramedCloud,
                popupListClass: OpenLayers.Popup.FramedCloud
            }, 
            options
        );
        OpenLayers.Control.prototype.initialize.apply(this, [options]);

        this.controls = {};
        if (this.popupHoverClass) {
            this.controls.hover = new OpenLayers.Control.SelectFeature([], {
                hover: true,
                highlightOnly: true,
                eventListeners: {
                    scope: this,
                    beforefeaturehighlighted: this.onBeforefeaturehighlighted,
                    featurehighlighted: this.onFeaturehighlighted,
                    featureunhighlighted: this.onFeatureunhighlighted
                }
            });
        }
        if (this.popupSelectClass) {
            if (this.selectionBox) {
                this.handlerBox = new OpenLayers.Handler.Box(
                    this, {
                        done: this.onSelectBox
                    }, {
                        boxDivClassName: "olHandlerBoxSelectFeature", 
                        keyMask: this.selectionBoxKeyMask
                    }
                ); 
            }
            this.controls.select = new OpenLayers.Control.SelectFeature([], {
                clickout: this.clickout,
                scope: this,
                onSelect: this.onSelectFeature,
                onUnselect: this.unselectFeature
            });
        }
        this.layerListFeaturesTemplate = this.translateTemplate(
                                               this.layerListFeaturesTemplate);
        this.hoverClusterTemplate = this.translateTemplate(
                                               this.hoverClusterTemplate);
        this.layerListeners = {
            scope: this,
            "featuresremoved": this.showAllSelectedFeatures,
            "visibilitychanged": this.showAllSelectedFeatures
        };
        this.popupObjs ={
            list: {popup: null, html: ""}, 
            hover: {popup: null, html: ""}, 
            select: {popup: null, html: ""}
        };
        this.templates = {};
        this.layers = [];
        this.map && this.setMap(this.map);
    },

    /**
     * APIMethod: destroy
     */
    destroy: function () {
        this.deactivate();
        this.layerListeners = null;
        this.popupObjs = null;
        this.templates = null;
        this.layers = null;
        this.handlerBox && this.handlerBox.destroy();
        this.handlerBox = null;
        this.controls.select && this.controls.select.destroy();
        this.controls.hover && this.controls.hover.destroy();
        this.controls = null;
        OpenLayers.Control.prototype.destroy.apply(this, arguments);
    },
    
    /**
     * APIMethod: activate
     * Activates the control.
     * 
     * Returns:
     * {Boolean} The control was effectively activated.
     */
    activate: function () {
        if (!this.events) { // This should be in OpenLayers.Control: Can not activate a destroyed control.
            return false;
        }
        var i, len;
        if (!this.active && this.events) { // Add the layers before activating improves performance.
            for (i = 0, len = this.map.layers.length; i < len; i++) {
                this.addLayer(this.map.layers[i]);
            }
        }
        if (OpenLayers.Control.prototype.activate.apply(this, arguments)) {
            this.map.events.on({
                scope: this,
                "addlayer": this.onAddLayer,
                "removelayer": this.onRemoveLayer
            });
            for (i = 0, len = this.layers.length; i < len; i++) {
                var layer = this.layers[i];
                layer.map && layer.events.on(this.layerListeners);
            }
            var controls = this.controls;
            if (controls.hover) {
                controls.hover.setLayer(this.layers);
                controls.hover.activate();
            }
            this.handlerBox && this.handlerBox.activate();
            if (controls.select) {
                controls.select.setLayer(this.layers);
                controls.select.activate();
            }
            return true;
        } else {
            return false;
        }
    },

    /**
     * APIMethod: deactivate
     * Deactivates the control.
     * 
     * Returns:
     * {Boolean} The control was effectively deactivated.
     */
    deactivate: function () {
        if (OpenLayers.Control.prototype.deactivate.apply(this, arguments)) {
            this.map.events.un({
                scope: this,
                "addlayer": this.onAddLayer,
                "removelayer": this.onRemoveLayer
            });
            for (var i = 0, len = this.layers.length; i < len; i++) {
                this.layers[i].events.un(this.layerListeners);
            }
            var controls = this.controls;
            controls.hover && controls.hover.deactivate();
            this.handlerBox && this.handlerBox.deactivate();
            controls.select && controls.select.deactivate();
            this.destroyAllPopupObjs();
            return true;
        } else {
            return false;
        }
    },
    
    /** 
     * Method: setMap
     * Set the map property for the control. 
     * 
     * Parameters:
     * map - {<OpenLayers.Map>} 
     */
    setMap: function(map) {
        if (this. selectionBox && 
                this.selectionBoxKeyMask == OpenLayers.Handler.MOD_CTRL) {
        // To disable the context menu for machines which use CTRL-Click as a right click.
            map.viewPortDiv.oncontextmenu = OpenLayers.Function.False;
        }
        this.controls.hover && map.addControl(this.controls.hover);
        this.controls.select && map.addControl(this.controls.select);
        this.handlerBox && this.handlerBox.setMap(map);
        OpenLayers.Control.prototype.setMap.apply(this, arguments);
    },
    
    /**
     * Method: onAddLayer
     * Internal use only.
     */
    onAddLayer: function (evt) {
        var layer = evt.layer;
        if (this.templates[layer.id]) {
            // Set layers in the control when added to the map after activating this control.
            this.setLayer(layer);
        } else {
            this.addLayer(layer);
        }
    },
        
    /**
     * Method: onRemoveLayer
     * Internal use only.
     */
    onRemoveLayer: function (evt) {
        this.removeLayer(evt.layer);
    },
    
    /**
     * APIMethod: addLayer
     * 
     *
     * Parameters:
     * layer - {<OpenLayers.Layer.Vector>} 
     * options - {Object} Optional
     *
     * Options:
     * hoverTemplate - {String} || {Function} template used on hover a feature
     * selectTemplate - {String} || {Function} template used on select a feature
     * itemTemplate - {String} || {Function} template used to show a feature as an item in a list, see also 
     */
    addLayer: function (layer, options) {
        options = OpenLayers.Util.extend({
                hoverTemplate: layer.hoverPopupTemplate,
                selectTemplate: layer.selectPopupTemplate,
                itemTemplate: layer.itemPopupTemplate
            },
            options
        );
        if ((options.hoverTemplate || options.selectTemplate) && 
                !this.templates[layer.id] && 
                layer instanceof OpenLayers.Layer.Vector) {
            options.hoverTemplate = this.translateTemplate(options.hoverTemplate);
            options.selectTemplate = this.translateTemplate(options.selectTemplate);
            options.itemTemplate = this.translateTemplate(options.itemTemplate);
            this.templates[layer.id] = options;
            this.layers.push(layer);
            if (this.active && layer.map) {
                this.setLayer(layer);
            }
        }
    },
    /**
     * Method: setLayer
     */
    setLayer: function (layer) {
        layer.events.on(this.layerListeners);
        var controls = this.controls;
        controls.hover && controls.hover.setLayer(this.layers);
        controls.select && controls.select.setLayer(this.layers);
    },
    
    /**
     * APIMethod: removeLayer
     */    
    removeLayer: function (layer) {
        var layerId = layer.id;
        if (this.templates[layerId]) {
            delete this.templates[layerId];
            OpenLayers.Util.removeItem(this.layers, layer);
            if (this.active) {
                this.destroyAllPopupObjs();
                this.controls.hover && this.controls.hover.setLayer(this.layers);
                this.controls.select && this.controls.select.setLayer(this.layers);
                layer.events.un(this.layerListeners);
            }
        }
    },
    
    /**
     * Method: onSelectFeature
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>} the selected feature.
     */
    onSelectFeature: function (feature) {
        // Trick to not show individual features when using a selection box.
        if (!this.boxStarted) {
            this.destroyAllPopupObjs();
            this.showSelectedFeature(feature);
        }
        return this.events.triggerEvent("featureselected", {
            feature: feature, selectionBox: this.boxStarted
        });
    },
    
    /**
     * Method: onSelectBox
     * Callback from the handlerBox set up when <box> selection is true
     *     on.
     *
     * Parameters:
     * position - {<OpenLayers.Bounds> || <OpenLayers.Pixel> }  
     */
    onSelectBox: function(position) {
        if (this.events.triggerEvent("beforeselectionbox") !== false) {
            // Trick to not show individual features when using a selection box.
            this.boxStarted = true;
            OpenLayers.Control.SelectFeature.prototype.selectBox.apply(
                                                  this.controls.select, arguments);
            this.boxStarted = false;
            this.destroyAllPopupObjs();
            var count = this.showAllSelectedFeatures();
            this.events.triggerEvent("afterselectionbox", {count: count});
        }
    },
    
    /**
     * Method: onBeforefeaturehighlighted
     */
    onBeforefeaturehighlighted: function(evt) {
        return this.events.triggerEvent("beforefeaturehighlighted", {
            feature: evt.feature
        });
    },
    
    /**
     * Method: onHover
     * Internal use only.
     */
    onFeaturehighlighted: function (evt) {
        // Can not detect onLeaving because was covered by a select popup, so must be destroyed.
        this.destroyPopupObj(this.popupObjs.hover);
        var feature = evt.feature;
        var template = this.templates[feature.layer.id].hoverTemplate;
        if (template && this.popupHoverClass) {
            if (feature.cluster) {
                var response = false;
                if (feature.cluster.length == 1){
                    // show cluster as a single feature.
                    this.popupObjs.hover.popup = this.showPopup(
                        this.popupHoverClass, 
                        "hover", 
                        feature.geometry.getBounds().getCenterLonLat(), 
                        this.renderTemplate(
                            template, 
                            OpenLayers.Util.extend(
                                feature.cluster[0].clone(),
                                {layer: feature.layer}
                            )
                        ),
                        false, false
                    );
                    response = !!this.popupObjs.hover.popup;
                } 
                if (feature.cluster.length >= 1 && response === false) {
                    this.popupObjs.hover.popup = this.showPopup(
                        this.popupHoverClass, 
                        "hover", 
                        feature.geometry.getBounds().getCenterLonLat(), 
                        this.renderTemplate(this.hoverClusterTemplate, feature),
                        false, false
                    );
                }
            } else {
                this.popupObjs.hover.popup = this.showPopup(
                    this.popupHoverClass, 
                    "hover", 
                    feature.geometry.getBounds().getCenterLonLat(), 
                    this.renderTemplate(template, feature),
                    false, false
                );
            }
        }
        return this.events.triggerEvent("featurehighlighted", {
            feature: feature
        });
    },
    
    /**
     * Method: onLeaving
     */
    onFeatureunhighlighted: function (evt) {
        this.destroyPopupObj(this.popupObjs.hover);
        return this.events.triggerEvent("featureunhighlighted", {
            feature: evt.feature
        });
    },
    
    /**
     * Method: renderListFeaturesTemplate
     * Called when the select feature control unselects a feature.
     *
     * Parameters:
     */
    renderListFeaturesTemplate: function (template, features, bounds) {
        var result = {
            html: "",
            count: 0
        };
        var i, len, feature;
        for (i=0, len = features.length; i<len; ++i) {
            feature = features[i];
            if (feature.cluster && feature.cluster.length) {
                var resultCluster;
                resultCluster = this.renderListFeaturesTemplate(
                                            template, feature.cluster, bounds);
                result.html += resultCluster.html;
                result.count += resultCluster.count;
            } else {
                bounds.extend(feature.geometry.getBounds());
                result.html += this.renderTemplate(
                    template, 
                    feature
                ) + "\n";
                result.count++;
            }
        }
        return result;
    },
    
    /**
     * Method: unselectFeature
     * Called when the select feature control unselects a feature.
     *
     * Parameters:
     */
    unselectFeature: function (feature) {
        // Feature unselected, so then hover and select smart popups must be destroyed.
        this.destroyAllPopupObjs();
        return this.events.triggerEvent("featureunselected", {
            feature: feature
        });
    },
    
    /**
     * Method: showSelectedFeature
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>} the feature.
     */
    showSelectedFeature: function (feature) {
        var response = false;
        var html;
        if (feature.cluster) {
            if (feature.cluster.length == 1){
                // Try to show the cluster as a single feature.
                response = this.showSelectedFeature(
                        OpenLayers.Util.extend(
                            feature.cluster[0].clone(),
                            {layer: feature.layer}
                        )
                );
            } else if (feature.cluster.length == 0){
                response = false;
            } 
            if (feature.cluster.length >= 1 && response === false) {
                var bounds = new OpenLayers.Bounds();
                html = this.renderLayerTemplate(
                                       feature.layer, feature.cluster, bounds);
                this.showSelectPopup(this.popupObjs.list,
                    this.popupListClass,
                    "list",
                    bounds.getCenterLonLat(),
                    html,
                    this.closeBox
                );
                response = !!this.popupObjs.list.popup;
            }
        } else if (this.popupSelectClass) {
            var template = this.templates[feature.layer.id].selectTemplate;
            if (template) {
                html = this.renderTemplate(template, feature)
                this.showSelectPopup(this.popupObjs.select,
                    this.popupSelectClass, 
                    "select", 
                    feature.geometry.getBounds().getCenterLonLat(), 
                    html,
                    this.closeBox
                );
            }
            response = !!this.popupObjs.select.popup;
        }
        return response;
    },

    /**
     * APIMethod: showFeatureSelectedById
     *
     * Parameters:
     * layerId - {String} id of the layer of selected feature.
     * featureId - {String} id of the selected feature.
     */
    showFeatureSelectedById: function (layerId, featureId) {
        var layers = this.controls.select.layers || [this.controls.select.layer];
        var i, len, layer;
        for (i=0, len=layers.length; i<len; i++) {
            layer = layers[i];
            if (layerId == layer.id) {
                var sFeatures = layer.selectedFeatures;
                var ii, len2, feature;
                for (ii=0, len2 = sFeatures.length; ii<len2; ii++) {
                    feature = sFeatures[ii];
                    if (feature.id == featureId) {
                        this.destroyPopupObj(this.popupObjs.select);
                        return this.showSelectedFeature(feature);
                    }
                }
            }
        }
    },
    
    /**
     * Method: showAllSelectedFeatures
     *
     * Returns:
     * {Integer} Number of selected features.
     */
    showAllSelectedFeatures: function () {
        var layers = this.controls.select.layers || [this.controls.select.layer];
        var i, len, layer, sFeatures, feature0, 
            bounds = new OpenLayers.Bounds(),
            count = 0,
            html = "";
        for (i=0, len=layers.length; i<len; i++) {
            layer = layers[i];
            if (layer.visibility) {
                sFeatures = layer.selectedFeatures;
                if (sFeatures.length) {
                    count += sFeatures.length;
                    feature0 = sFeatures[0];
                    html += this.renderLayerTemplate(layer, sFeatures, bounds);
                }
            }
        }
        var response = false;
        if (count == 1) {
            // Try to show the only feature as a single feature.
            response = this.showSelectedFeature(feature0);
        } 
        if (!response) {
            if (html) {
                this.showSelectPopup(this.popupObjs.list,
                    this.popupListClass,
                    "list",
                    bounds.getCenterLonLat(),
                    html,
                    this.closeBox,
                    true
                );
            } else {
                this.destroyAllPopupObjs();
            }
        }
        return count;
    },
    
    /**
     * Method: renderLayerTemplate
     * Called when the select feature control unselects a feature.
     *
     * Parameters:
     */
    renderLayerTemplate: function (layer, features, bounds) {
        var html = "";
        var template = this.layerListFeaturesTemplate;
        if (template) {
            var r = this.renderListFeaturesTemplate(
                this.templates[layer.id].itemTemplate,
                features,
                bounds
            );
            if (r.html) {
                html = this.renderTemplate(
                    template, {layer: layer, count: r.count, html: r.html}
                ) + "\n";
            }
        } 
        return html;
    },
    
    /**
     * Method: showSelectPopup
     * Internal use only.
     *
     * Parameters:
     */
    showSelectPopup: function (popupObj, popupClass, popupType, lotLat, html, closeBox) {
        // Only show popups that are not on display:
        //      showAllSelectedFeatures is called when the visibility of a layer 
        //      changes, but this can produce the same html. Do not want move 
        //      map if popup is the same.
        if (popupObj.html !== html) {
            this.destroyAllPopupObjs();
            popupObj.popup = this.showPopup(popupClass, popupType, lotLat, html, closeBox);
            popupObj.html = popupObj.popup ? html : "";
        }
    },
    
    /**
     * Method: showPopup
     * Internal use only.
     *
     * Parameters:
     */
    showPopup: function (popupClass, popupType, lotLat, html, closeBox) {
        if (!popupClass) {
            return null;
        }
        if (html) {
            if (typeof popupClass == 'string') {
                var div = document.getElementById(popupClass);
                if (div) {
                    div.innerHTML = html;
                    return popupClass;
                } else {
                    return null;
                }
            } else {
                var popup = new popupClass(
                    this.id + "_" + popupType, 
                    lotLat,
                    new OpenLayers.Size(100,100),
                    html
                );
                // The API of the popups is not homogeneous, closeBox may be the fifth or sixth argument, it depends!
                // So forces closeBox using other ways.
                if (closeBox) { 
                    var me = this;
                    popup.addCloseBox(function () {
                        // unselect to can select itself after close by closeBox.
                        me.controls.select.unselectAll();
                    });
                    popup.closeDiv.style.zIndex = 1;
                }
                popup.autoSize = true;
                OpenLayers.Element.addClass(popup.contentDiv, 
                                          this.displayClass + "_" + popupType);
                this.map.addPopup(popup);
                return popup;
            }
        } else {
            return null;
        }
    },
    
    /**
     * Method: destroyAllPopupObjs
     * Internal use only.
     */
    destroyAllPopupObjs: function () {
        this.destroyPopupObj(this.popupObjs.hover);
        this.destroyPopupObj(this.popupObjs.select);
        this.destroyPopupObj(this.popupObjs.list);
    },
    
    /**
     * Method: destroyPopup
     * Internal use only.
     */
    destroyPopupObj: function (popupObj) {
        var popup = popupObj.popup;
        if (popup) {
            if (typeof popup == 'string') {
                var div = document.getElementById(popup);
                if (div) {
                    div.innerHTML = "";
                }
            } else {
                if (popup.id) { // The popup may have been destroyed by another process
                    if (this.map) {
                        this.map.removePopup(popup);
                    }
                    popup.destroy(); 
                }
            }
            popupObj.popup = null;
            popupObj.html = "";
        }
    },

    /**
     * Function: translateTemplate
     * When the template is a string returns a internationalized template, 
     *     otherwise returns it as is.
     * Templates containing patterns as ${OpenLayers.i18n("key")} are 
     *     internationalized by this function using <OpenLayers.i18n> function.
     * This function is used at creating a instance of the control and using 
     *     <addLayer> method. 
     *
     * Parameters: 
     * template - {String} || {Function}
     * 
     * Returns:
     * {String} || {Function} A internationalized template.
     */
    translateTemplate: function (template) {
        if (typeof template == 'string') {
            return template.replace( // internationalize template.
                this.regExesI18n,
                function (a,key) {
                    return OpenLayers.i18n(key);
                }
            );
        } else {
            return template;
        }
    },
    
    /**
     * Function: renderTemplate
     * Given a string with tokens in the form ${token}, return a string
     *     with tokens replaced with properties from the given context
     *     object.  Represent a literal "${" by doubling it, e.g. "${${".
     *
     * Parameters:
     * template - {String} || {Function}
     *     If template is a string then template
     *     has the form "literal ${token}" where the token will be replaced
     *     by the value of context["token"]. When is a function it will receive 
     *     the context as a argument.
     * context - {Object} Object with properties corresponding to the tokens 
     *     in the template.
     *
     * Returns:
     * {String} A string with tokens replaced from the context object.
     */
    renderTemplate: function (template, context) {
        if (typeof template == 'string') {
            return OpenLayers.String.format(template, context)
        } else if (typeof template == 'function') {
            return template(context);
        } else {
            return "";
        }
    },
    
    CLASS_NAME: "OpenLayers.Control.FeaturePopups"
});

/**
 * APIFunction: getTemplate
 */
OpenLayers.Control.FeaturePopups.getTemplate = function (url) {
    var response = OpenLayers.Request.GET({url:url, async:false});
    if (response.responseText) {
        return response.responseText;
    } else {
        // If error loads text error as template
        return response.status + "-" + response.statusText; 
    }
};