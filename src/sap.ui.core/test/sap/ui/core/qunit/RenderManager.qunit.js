/* global QUnit, sinon, TestControlRenderer */
sap.ui.define([
	"sap/ui/core/Control",
	"sap/ui/core/RenderManager",
	"sap/ui/core/Element",
	"sap/ui/core/IconPool"
], function(Control, RenderManager, Element, IconPool){
	"use strict";

	var fCheckRendererInterface = null;

	//Declare a simple test controls

	var TestControl = Control.extend("TestControl", {
		renderer: {
			render: function(oRM, oControl) {
				oRM.write("<div");
				oRM.writeControlData(oControl);
				TestControlRenderer.doAdditionalThings(oRM, oControl);
				oRM.write(">[" + oControl.getId() + "]</div>");

				if (fCheckRendererInterface) {
					fCheckRendererInterface(oRM);
				}
			},
			doAdditionalThings: function(oRM, oControl) {}
		},

		onBeforeRendering: function() {
			if (this.doBeforeRendering) {
				this.doBeforeRendering();
			}
		},

		onAfterRendering: function() {
			if (this.doAfterRendering) {
				this.doAfterRendering();
			}
		}
	});

	var ACCTestControl = TestControl.extend("ACCTestControl", {
		metadata: {
			properties: {
				"editable": {
					type: "boolean",
					defaultValue: true
				},
				"enabled": {
					type: "boolean",
					defaultValue: true
				},
				"visible": {
					type: "boolean",
					defaultValue: true
				},
				"required": {
					type: "boolean",
					defaultValue: false
				},
				"selected": {
					type: "boolean",
					defaultValue: false
				},
				"checked": {
					type: "boolean",
					defaultValue: false
				},
				"other": {
					type: "string",
					defaultValue: "Value"
				}
			},
			associations: {
				"ariaDescribedBy": {
					type: "sap.ui.core.Element",
					multiple: true
				},
				"ariaLabelledBy": {
					type: "sap.ui.core.Element",
					multiple: true
				}
			}
		},

		renderer: "TestControlRenderer"
	});

	//Test helper functions

	var checkRendering = function(assert, aControls, sTargetId, bExpectExisting, fActionCallBack, sOldParentId) {
		return new Promise(function(done) {
			var iBeforeCounter = 0;
			var iAfterCounter = 0;

			var fBefore = function() {
				iBeforeCounter++;
			};

			var fAfter = function() {
				iAfterCounter++;
			};

			for (var i = 0; i < aControls.length; i++) {
				aControls[i].doBeforeRendering = fBefore;
				aControls[i].doAfterRendering = fAfter;
			}

			checkControlsInDom(assert, aControls, sOldParentId ? sOldParentId : sTargetId, bExpectExisting);

			fActionCallBack(jQuery.sap.byId(sTargetId).get(0), aControls);

			assert.equal(iBeforeCounter, aControls.length, "onBeforeRendering should be called");

			checkControlsInDom(assert, aControls, sTargetId, true);

			if (sap.ui.Device.browser.safari) {
				//in safari async because onAfterRendering ist called with delay
				var delayedCall = function() {
					assert.equal(iAfterCounter, aControls.length, "onAfterRendering should be called");
					for (var i = 0; i < aControls.length; i++) {
						aControls[i].doBeforeRendering = null;
						aControls[i].doAfterRendering = null;
					}
					done();
				};
				setTimeout(delayedCall, 500);
			} else {
				assert.equal(iAfterCounter, aControls.length, "onAfterRendering should be called");
				for (var i = 0; i < aControls.length; i++) {
					aControls[i].doBeforeRendering = null;
					aControls[i].doAfterRendering = null;
				}
				done();
			}

		});

	};

	var getTestControlHtml = function(sId, sAdditionalHTML) {
		if (!sAdditionalHTML){
			sAdditionalHTML = "";
		}
		return "<div id=\"" + sId + "\" data-sap-ui=\"" + sId + "\"" + sAdditionalHTML + ">[" + sId + "]</div>";
	};

	var checkControlsInDom = function(assert, aControls, sTargetId, bExpectExisting) {
		for (var i = 0; i < aControls.length; i++) {
			var jControlRef = jQuery.sap.byId(aControls[i].getId());
			if (bExpectExisting) {
				assert.equal(jControlRef.length, 1, "Control is rendered already");
				assert.equal(jControlRef.parent().attr("id"), sTargetId, "Control is child of Dom Ref with ID '" + sTargetId + "'");
			} else {
				assert.equal(jControlRef.length, 0, "Control is not rendered yet");
			}
		}
	};

	var checkChildOrder = function(assert, sParentId, aChildIds) {
		var jChildren = jQuery.sap.byId(sParentId).children();
		assert.equal(aChildIds.length, jChildren.length, "Number of children of DOM node '" + sParentId + "'");
		for (var i = 0; i < aChildIds.length; i++) {
			assert.equal(aChildIds[i], jQuery(jChildren.get(i)).attr("id"), "DOM node '" + aChildIds[i] + "' is at position " + i);
		}
	};

	var checkRMWriter = function(assert, sExpectedResult, bExpectReturnsRM, iExpectedNumberOfControls, fActionCallback, fCheckCallBack) {
		var rm = new RenderManager();
		var oCheckFunctionResult = fActionCallback(rm);
		assert.equal(rm.aBuffer.join(""), sExpectedResult, "Writer function produce expected output.");
		if (bExpectReturnsRM) {
			assert.ok(rm === oCheckFunctionResult, "Writer function returns RenderManager again for chaining.");
		} else {
			assert.ok(rm != oCheckFunctionResult, "Writer function does not return RenderManager for chaining.");
		}
		assert.equal(rm.aRenderedControls.length, iExpectedNumberOfControls, "Writer function rendered expected number of controls.");
		if (fCheckCallBack){
			fCheckCallBack(rm);
		}
	};


	//Control initialization

	var aControls = [];
	for (var i = 0; i < 8; i++) {
		aControls.push(new TestControl("control" + i));
	}


	QUnit.module("Core API");

	QUnit.test("RenderManager.getConfiguration", function(assert) {
		var rm = new RenderManager();
		assert.ok(rm.getConfiguration() === sap.ui.getCore().getConfiguration(), "getConfiguration returns the same like Core.getConfiguration");
	});

	QUnit.test("Core.getRenderManager/createRenderManager", function(assert) {
		var c = sap.ui.getCore();
		assert.ok(c.getRenderManager() != c.getRenderManager(), "Core.getRenderManager always returns a new RenderManager instance");
		assert.ok(c.createRenderManager() != c.createRenderManager(), "Core.createRenderManager always returns a new RenderManager instance");
	});

	QUnit.module("Interfaces");

	var aCommonFunctions = ["renderControl", "write", "writeEscaped", "translate", "writeAcceleratorKey", "writeControlData", "writeInvisiblePlaceholderData",
		"writeElementData", "writeAttribute", "writeAttributeEscaped", "addClass", "writeClasses",
		"addStyle", "writeStyles", "writeAccessibilityState", "writeIcon",
		"getConfiguration", "getHTML", "cleanupControlWithoutRendering"
	];
	var aNonRendererFunctions = ["render", "flush", "destroy"];

	QUnit.test("Full Interface", function(assert) {
		var rm = sap.ui.getCore().createRenderManager();
		var aAllFunctions = aCommonFunctions.concat(aNonRendererFunctions);
		for (var s in rm) {
			assert.ok(jQuery.inArray(s, aAllFunctions) >= 0, "Full Interface provides function '" + s + "'.");
		}
	});

	QUnit.test("Renderer Interface", function(assert) {
		var rm = sap.ui.getCore().createRenderManager();
		var oControl0 = new TestControl("TestContr0");
		fCheckRendererInterface = function(rmIf) {
			for (var s in rmIf) {
				assert.ok(jQuery.inArray(s, aCommonFunctions) >= 0, "Renderer Interface provides function '" + s + "'.");
			}
		};
		rm.renderControl(oControl0);
		fCheckRendererInterface = null;
	});


	QUnit.module("Writer API");

	//No checks due to deprecation for
	//translate, writeAcceleratorKey, writeAccessibilityState, getHTML

	QUnit.test("RenderManager.write", function(assert) {
		checkRMWriter(assert, "Hello, how are you?", true, 0, function(rm) {
			return rm.write("Hello", ",", " how are ", "you?");
		});
	});

	QUnit.test("RenderManager.writeEscaped", function(assert) {
		checkRMWriter(assert, "Hello&#x20;&amp;&lt;&quot;&#x27;&#x5c;", true, 0, function(rm) {
			return rm.writeEscaped("Hello &<\"\'\\");
		});
		// in design time tools and in general string and enum (string) properties could be null
		checkRMWriter(assert, "", true, 0, function(rm) {
			return rm.writeEscaped(null);
		});
	});

	QUnit.test("RenderManager.writeControlData", function(assert) {
		checkRMWriter(assert, " id=\"TestElem1\" data-sap-ui=\"TestElem1\"", true, 0, function(rm) {
			return rm.writeControlData(new Control("TestElem1"));
		});
	});

	QUnit.test("RenderManager.writeElementData", function(assert) {
		checkRMWriter(assert, " id=\"TestElem2\" data-sap-ui=\"TestElem2\"", true, 0, function(rm) {
			return rm.writeElementData(new Element("TestElem2"));
		});
	});

	QUnit.test("RenderManager.writeAttribute", function(assert) {
		checkRMWriter(assert, " attr=\"value\"", true, 0, function(rm) {
			return rm.writeAttribute("attr", "value");
		});
	});

	QUnit.test("RenderManager.writeAttributeEscaped", function(assert) {
		checkRMWriter(assert, " attr=\"value&#x20;&amp;&lt;&quot;&#x27;&#x5c;\"", true, 0, function(rm) {
			return rm.writeAttributeEscaped("attr", "value &<\"\'\\");
		});
	});

	QUnit.test("RenderManager.renderControl", function(assert) {
		var oControl1 = new TestControl("TestContr1");
		var oControl2 = new TestControl("TestContr2");
		checkRMWriter(assert, getTestControlHtml("TestContr1") + getTestControlHtml("TestContr2"), true, 2, function(rm) {
			rm.renderControl(oControl1);
			return rm.renderControl(oControl2);
		}, function(rm) {
			assert.ok(rm.aRenderedControls[0] === oControl1, "First control is in rendered controls list");
			assert.ok(rm.aRenderedControls[1] === oControl2, "Second control is in rendered controls list");
		});
	});

	QUnit.test("RenderManager.addStyle", function(assert) {
		checkRMWriter(assert, "", true, 0, function(rm) {
			assert.ok(!rm.aStyleStack[rm.aStyleStack.length - 1].aStyle, "Style infrastructure initially not available.");
			rm.addStyle("att1");
			assert.ok(!rm.aStyleStack[rm.aStyleStack.length - 1].aStyle, "Style infrastructure still not available after call without value.");
			rm.addStyle("att1", "val1");
			assert.ok(!!rm.aStyleStack[rm.aStyleStack.length - 1].aStyle, "Style infrastructure now initialized");
			return rm.addStyle("att2", "val2");
		});
	});

	QUnit.test("RenderManager.writeStyles", function(assert) {
		checkRMWriter(assert, " style=\"att1:val1;att2:val2\" ", true, 0, function(rm) {
			rm.addStyle("att1", "val1");
			rm.addStyle("att2", "val2");
			return rm.writeStyles();
		}, function(rm) {
			assert.ok(!rm.aStyleStack[rm.aStyleStack.length - 1].aStyle, "Style infrastructure is reset");
		});
	});

	QUnit.test("RenderManager.addClass", function(assert) {
		checkRMWriter(assert, "", true, 0, function(rm) {
			assert.ok(!rm.aStyleStack[rm.aStyleStack.length - 1].aClasses, "Class infrastructure initially not available.");
			rm.addClass();
			assert.ok(!rm.aStyleStack[rm.aStyleStack.length - 1].aClasses, "Class infrastructure still not available after call without value.");
			rm.addClass("Class1");
			assert.ok(!!rm.aStyleStack[rm.aStyleStack.length - 1].aClasses, "Class infrastructure now initialized");
			return rm.addClass("Class2");
		});
	});

	QUnit.test("RenderManager.writeClasses", function(assert) {
		checkRMWriter(assert, " class=\"Class1 Class2\" ", true, 0, function(rm) {
			rm.addClass("Class1");
			rm.addClass("Class2");
			return rm.writeClasses();
		}, function(rm) {
			assert.ok(!rm.aStyleStack[rm.aStyleStack.length - 1].aClasses, "Class infrastructure is reset");
			assert.ok(!rm.aStyleStack[rm.aStyleStack.length - 1].aCustomStyleClasses, "CustomClass infrastructure is reset");
		});

		var oControl3 = new TestControl("TestContr3");
		oControl3.addStyleClass("Class3", true);
		oControl3.addStyleClass("Class2", true); //For duplicate check

		checkRMWriter(assert, getTestControlHtml("TestContr3", " class=\"Class1 Class2 Class3\" "), true, 1, function(rm) {
			TestControlRenderer.doAdditionalThings = function(oRM, oControl) {
				rm.addClass("Class1");
				rm.addClass("Class2");
				rm.writeClasses();
			};
			rm.renderControl(oControl3);
			TestControlRenderer.doAdditionalThings = function(oRM, oControl) {};
			return rm.writeClasses();
		}, function(rm) {
			assert.ok(!rm.aStyleStack[rm.aStyleStack.length - 1].aClasses, "Class infrastructure is reset");
			assert.ok(!rm.aStyleStack[rm.aStyleStack.length - 1].aCustomStyleClasses, "CustomClass infrastructure is reset");
		});
	});

	QUnit.test("RenderManager.writeAccessibilityState", function(assert) {
		var oControl1 = new ACCTestControl("TestACCContr1");
		var oControl2 = new ACCTestControl("TestACCContr2", {
			"editable": false, //readonly
			"enabled": false, //disabled
			"visible": false, //hidden
			"required": true, //required
			"selected": true, //selected
			"checked": true, //checked
			"ariaDescribedBy": [oControl1, "test1"],
			"ariaLabelledBy": [oControl1, "test2"]
		});

		function checkACCOutput(sOutput, sValue) {
			assert.ok(sOutput.indexOf(sValue) >= 0, "Output contains " + sValue + " ('" + sOutput + "')");
		}

		//Check defaults
		var rm = new RenderManager();
		assert.ok(rm === rm.writeAccessibilityState(oControl1), "Writer function returns RenderManager again for chaining.");
		var sOutput = rm.aBuffer.join("");
		assert.ok(sOutput.length === 0, "No output for defaults: " + sOutput);

		//Check auto-generation
		rm = new RenderManager();
		rm.writeAccessibilityState(oControl2);
		sOutput = rm.aBuffer.join("");
		checkACCOutput(sOutput, "aria-readonly=\"true\"");
		checkACCOutput(sOutput, "aria-disabled=\"true\"");
		checkACCOutput(sOutput, "aria-hidden=\"true\"");
		checkACCOutput(sOutput, "aria-required=\"true\"");
		checkACCOutput(sOutput, "aria-selected=\"true\"");
		checkACCOutput(sOutput, "aria-checked=\"true\"");
		// escape it because attributes' values are escaped since 1.19.0 & 1.18.5 & 1.16.10
		var sText = jQuery.sap.escapeHTML("TestACCContr1 test1");
		checkACCOutput(sOutput, "aria-describedby=\"" + sText + "\"");
		sText = jQuery.sap.escapeHTML("TestACCContr1 test2");
		checkACCOutput(sOutput, "aria-labelledby=\"" + sText + "\"");

		//Check reset
		rm = new RenderManager();
		rm.writeAccessibilityState(oControl2, {
			"readonly": null,
			"disabled": null,
			"hidden": null,
			"required": null,
			"selected": null,
			"checked": null,
			"describedby": null,
			"labelledby": null
		});
		sOutput = rm.aBuffer.join("");
		assert.ok(sOutput.length == 0, "No output for reset values: " + sOutput);

		//Check custom attributes only
		rm = new RenderManager();
		rm.writeAccessibilityState({
			"hello1": "hello2"
		});
		sOutput = rm.aBuffer.join("");
		checkACCOutput(sOutput, "aria-hello1=\"hello2\"");

		//Check control and custom attributes
		rm = new RenderManager();
		rm.writeAccessibilityState(oControl2, {
			"hello1": "hello2"
		});
		sOutput = rm.aBuffer.join("");
		checkACCOutput(sOutput, "aria-readonly=\"true\"");
		checkACCOutput(sOutput, "aria-disabled=\"true\"");
		checkACCOutput(sOutput, "aria-hidden=\"true\"");
		checkACCOutput(sOutput, "aria-required=\"true\"");
		checkACCOutput(sOutput, "aria-selected=\"true\"");
		checkACCOutput(sOutput, "aria-checked=\"true\"");
		// escape it because attributes' values are escaped since 1.19.0 & 1.18.5 & 1.16.10
		sText = jQuery.sap.escapeHTML("TestACCContr1 test1");
		checkACCOutput(sOutput, "aria-describedby=\"" + sText + "\"");
		sText = jQuery.sap.escapeHTML("TestACCContr1 test2");
		checkACCOutput(sOutput, "aria-labelledby=\"" + sText + "\"");
		checkACCOutput(sOutput, "aria-hello1=\"hello2\"");

		//Check append for describedby and labelledby
		rm = new RenderManager();
		rm.writeAccessibilityState(oControl2, {
			"readonly": {
				value: false,
				append: true
			},
			"describedby": {
				value: "hello1",
				append: true
			},
			"labelledby": {
				value: "hello2",
				append: true
			}
		});
		sOutput = rm.aBuffer.join("");
		checkACCOutput(sOutput, "aria-readonly=\"false\"");
		// escape it because attributes' values are escaped since 1.19.0 & 1.18.5 & 1.16.10
		sText = jQuery.sap.escapeHTML("TestACCContr1 test1 hello1");
		checkACCOutput(sOutput, "aria-describedby=\"" + sText + "\"");
		sText = jQuery.sap.escapeHTML("TestACCContr1 test2 hello2");
		checkACCOutput(sOutput, "aria-labelledby=\"" + sText + "\"");
	});

	QUnit.module("Non Renderer Functions");

	QUnit.test("RenderManager.destroy", function(assert) {
		var rm = new RenderManager();
		var oControl4 = new TestControl("TestContr4");
		rm.renderControl(oControl4);
		assert.ok(rm.aBuffer.length != 0, "HTML Buffer is filled after some writing");
		assert.ok(rm.aRenderedControls != 0, "Rendered Control Buffer is filled after some writing");
		rm.destroy();
		assert.ok(rm.aBuffer.length == 0, "HTML Buffer cleared after destroy");
		assert.ok(rm.aRenderedControls == 0, "Rendered Control Buffer cleared after destroy");
	});

	QUnit.test("RenderManager.render (Initial Rendering)", function(assert) {
		var rm = sap.ui.getCore().createRenderManager(),
			pDone;

		//Initial Rendering
		pDone = checkRendering(assert, [aControls[0], aControls[1], aControls[2]], "area1", false, function(oTargetDomNode, aCtrls) {
			rm.render(aCtrls[0], oTargetDomNode);
			rm.render(aCtrls[1], oTargetDomNode);
			rm.render(aCtrls[2], oTargetDomNode);
		});

		checkChildOrder(assert, "area1", [aControls[0].getId(), aControls[1].getId(), aControls[2].getId()]);
		return pDone;
	});

	QUnit.test("RenderManager.render (Rerendering to same parent DOM node)", function(assert) {
		var rm = sap.ui.getCore().createRenderManager(),
			pDone;

		//Rerendering to same parent DOM node
		pDone = checkRendering(assert, [aControls[1]], "area1", true, function(oTargetDomNode, aCtrls) {
			rm.render(aCtrls[0], oTargetDomNode);
		});

		checkChildOrder(assert, "area1", [aControls[0].getId(), aControls[1].getId(), aControls[2].getId()]);
		return pDone;
	});

	QUnit.test("RenderManager.render (Move to different parent DOM node)", function(assert) {
		var rm = sap.ui.getCore().createRenderManager(),
			pDone;

		//Move to different parent DOM node
		pDone = checkRendering(assert, [aControls[1]], "area3", true, function(oTargetDomNode, aCtrls) {
			rm.render(aCtrls[0], oTargetDomNode);
		}, "area1");

		checkChildOrder(assert, "area1", [aControls[0].getId(), aControls[2].getId()]);
		checkChildOrder(assert, "area3", [aControls[1].getId()]);
		return pDone;
	});

	QUnit.test("RenderManager.flush(Initial Rendering)", function(assert) {
		var rm = sap.ui.getCore().createRenderManager(),
			pDone;

		//Initial Rendering
		pDone = checkRendering(assert, [aControls[3], aControls[4]], "area2", false, function(oTargetDomNode, aCtrls) {
			rm.renderControl(aCtrls[0]);
			rm.write("<div");
			rm.writeAttribute("id", "divider");
			rm.write(">|</div>");
			rm.renderControl(aCtrls[1]);
			rm.flush(oTargetDomNode);
		});

		checkChildOrder(assert, "area2", [aControls[3].getId(), "divider", aControls[4].getId()]);
		return pDone;
	});

	QUnit.test("RenderManager.flush(Rerendering to same parent DOM node)", function(assert) {
		var rm = sap.ui.getCore().createRenderManager(),
			pDone;

		//Rerendering to same parent DOM node
		pDone = checkRendering(assert, [aControls[3], aControls[4]], "area2", true, function(oTargetDomNode, aCtrls) {
			rm.renderControl(aCtrls[1]);
			rm.write("<div");
			rm.writeAttribute("id", "divider");
			rm.write(">|</div>");
			rm.renderControl(aCtrls[0]);
			rm.flush(oTargetDomNode);
		});

		checkChildOrder(assert, "area2", [aControls[4].getId(), "divider", aControls[3].getId()]);
		return pDone;
	});

	QUnit.test("RenderManager.flush(Move to different parent DOM node)", function(assert) {
		var rm = sap.ui.getCore().createRenderManager(),
			pDone;

		//Move to different parent DOM node
		pDone = checkRendering(assert, [aControls[3]], "area4", true, function(oTargetDomNode, aCtrls) {
			rm.renderControl(aCtrls[0]);
			rm.write("<div");
			rm.writeAttribute("id", "divider2");
			rm.write(">|</div>");
			rm.flush(oTargetDomNode);
		}, "area2");

		checkChildOrder(assert, "area2", [aControls[4].getId(), "divider"]);
		checkChildOrder(assert, "area4", [aControls[3].getId(), "divider2"]);
		return pDone;
	});

	QUnit.test("RenderManager.flush(insert at certain position)", function(assert) {
		var rm = sap.ui.getCore().createRenderManager(),
			done = assert.async();

		rm.renderControl(aControls[5]);
		rm.flush(jQuery.sap.domById("area2"), false, 1);
		rm.destroy();

		window.setTimeout(function() { // for delayed rendering in Safari
			checkChildOrder(assert, "area2", [aControls[4].getId(), aControls[5].getId(), "divider"]);
			done();
		}, sap.ui.Device.browser.safari ? 500 : 0);
	});

	QUnit.test("RenderManager.flush(insert at certain position < 0)", function(assert) {
		var rm = sap.ui.getCore().createRenderManager(),
			done = assert.async();

		rm.renderControl(aControls[6]);
		rm.flush(jQuery.sap.domById("area2"), false, -1);
		rm.destroy();

		window.setTimeout(function() { // for delayed rendering in Safari
			checkChildOrder(assert, "area2", [aControls[6].getId(), aControls[4].getId(), aControls[5].getId(), "divider"]);
			done();
		}, sap.ui.Device.browser.safari ? 500 : 0);
	});

	QUnit.test("RenderManager.flush(insert at certain position > #items)", function(assert) {
		var rm = sap.ui.getCore().createRenderManager(),
			done = assert.async();

		rm.renderControl(aControls[7]);
		rm.flush(jQuery.sap.domById("area2"), false, 42);
		rm.destroy();

		window.setTimeout(function() { // for delayed rendering in Safari
			checkChildOrder(assert, "area2", [aControls[6].getId(), aControls[4].getId(), aControls[5].getId(), "divider", aControls[7].getId()]);
			done();
		}, sap.ui.Device.browser.safari ? 500 : 0);
	});

	QUnit.test("RenderManager lock", function(assert) {
		var oCtrl1 = new TestControl();
		var oCtrl2 = new TestControl();

		oCtrl1.placeAt("area5");
		oCtrl2.placeAt("area5");
		sap.ui.getCore().applyChanges();

		oCtrl1.doBeforeRendering = function() {
			oCtrl2.rerender();
		};

		oCtrl1.doAfterRendering = function() {
			oCtrl2.rerender();
		};

		var iCounter = 0;

		oCtrl2.doAfterRendering = function() {
			iCounter++;
		};

		oCtrl1.rerender();

		assert.equal(iCounter, 0, "Number of rerenderings of Ctrl2");
	});

	QUnit.test("RenderManager writeIcon with Icon URL", function(assert) {
		jQuery.sap.require("sap.ui.core.IconPool");
		var rm = sap.ui.getCore().createRenderManager();
		var oIconInfo = IconPool.getIconInfo("wrench");
		rm.writeIcon(oIconInfo.uri, ["classA", "classB"], {
			id: "icon1",
			propertyA: "valueA",
			propertyB: "valueB"
		});
		rm.flush(jQuery.sap.domById("area6"));
		rm.destroy();

		var $icon1 = jQuery.sap.byId("icon1");
		assert.ok($icon1[0], "icon should be rendered");
		assert.ok($icon1.is("span"), "Icon URI should be rendered as a span");
		assert.equal($icon1.css("font-family"), oIconInfo.fontFamily, "Icon's font family is rendered");
		assert.equal($icon1.attr("data-sap-ui-icon-content"), oIconInfo.content, "Icon content is rendered as attribute");
		assert.ok($icon1.hasClass("classA"), "icon has classA as a CSS class");
		assert.ok($icon1.hasClass("classB"), "icon has classB as a CSS class");
		assert.ok($icon1.hasClass("sapUiIcon"), "icon has sapUiIcon as a CSS class");
		assert.ok($icon1.hasClass("sapUiIconMirrorInRTL"), "icon has sapUiIconMirrorInRTL as a CSS class");
		assert.equal($icon1.attr("propertyA"), "valueA", "Attribute should be set");
		assert.equal($icon1.attr("propertyB"), "valueB", "Attribute should be set");
		assert.notEqual($icon1.attr("aria-label"), undefined, "Attribute aria-label should be set");

		jQuery.sap.byId("area6").empty();

		rm = sap.ui.getCore().createRenderManager();
		oIconInfo = IconPool.getIconInfo("calendar");
		rm.writeIcon(oIconInfo.uri, ["classA", "classB"], {
			id: "icon1",
			propertyA: "valueA",
			propertyB: "valueB"
		});
		rm.flush(jQuery.sap.domById("area6"));
		rm.destroy();

		$icon1 = jQuery.sap.byId("icon1");
		assert.ok($icon1[0], "icon should be rendered");
		assert.ok($icon1.is("span"), "Icon URI should be rendered as a span");
		assert.equal($icon1.css("font-family"), oIconInfo.fontFamily, "Icon's font family is rendered");
		assert.equal($icon1.attr("data-sap-ui-icon-content"), oIconInfo.content, "Icon content is rendered as attribute");
		assert.ok($icon1.hasClass("classA"), "icon has classA as a CSS class");
		assert.ok($icon1.hasClass("classB"), "icon has classB as a CSS class");
		assert.ok($icon1.hasClass("sapUiIcon"), "icon has sapUiIcon as a CSS class");
		assert.ok(!$icon1.hasClass("sapUiIconMirrorInRTL"), "icon doesn't have sapUiIconMirrorInRTL as a CSS class");
		assert.equal($icon1.attr("propertyA"), "valueA", "Attribute should be set");
		assert.equal($icon1.attr("propertyB"), "valueB", "Attribute should be set");
		assert.notEqual($icon1.attr("aria-label"), undefined, "Attribute aria-label should be set");

		jQuery.sap.byId("area6").empty();
	});

	QUnit.test("RenderManager writeIcon with Icon URL. aria-label and aria-labelledby are set to null", function(assert) {
		jQuery.sap.require("sap.ui.core.IconPool");
		var rm = sap.ui.getCore().createRenderManager();
		var oIconInfo = IconPool.getIconInfo("wrench");
		rm.writeIcon(oIconInfo.uri, [], {
			id: "icon1",
			"aria-label": null,
			"aria-labelledby": null
		});
		rm.flush(jQuery.sap.domById("area6"));
		rm.destroy();

		var $icon1 = jQuery.sap.byId("icon1"),
			$invisibleText = jQuery.sap.byId("icon1-label");

		assert.ok($icon1[0], "icon should be rendered");
		assert.equal($icon1.attr("aria-label"), undefined, "Attribute aria-label should not be set");
		assert.equal($icon1.attr("aria-labelledby"), undefined, "Attribute aria-labelledby should not be set");
		assert.equal($invisibleText.length, 0, "No invisible text is rendered");

		jQuery.sap.byId("area6").empty();
	});

	QUnit.test("RenderManager writeIcon with Icon URL and aria-labelledby", function(assert) {
		jQuery.sap.require("sap.ui.core.IconPool");
		var rm = sap.ui.getCore().createRenderManager();
		var oIconInfo = IconPool.getIconInfo("wrench");
		rm.writeIcon(oIconInfo.uri, [], {
			id: "icon1",
			"aria-labelledby": "foo",
			alt: "abc"
		});
		rm.flush(jQuery.sap.domById("area6"));
		rm.destroy();

		var $icon1 = jQuery.sap.byId("icon1"),
			$invisibleText = jQuery.sap.byId("icon1-label"),
			sText = $invisibleText.text();
		assert.ok($icon1[0], "icon should be rendered");

		assert.equal($icon1.attr("aria-label"), undefined, "Attribute aria-label should not be set");
		assert.equal($icon1.attr("aria-labelledby"), "foo icon1-label", "Attribute aria-labelledby should contain both the given id and the id of the invisible text");
		assert.equal(sText, "abc", "The content of invisible text should be set");

		jQuery.sap.byId("area6").empty();
	});

	QUnit.test("RenderManager writeIcon with Image URL", function(assert) {
		var rm = sap.ui.getCore().createRenderManager(),
			sImgURL = jQuery.sap.getModulePath("sap.ui.core", "/themes/base/img/Busy.gif");
		rm.writeIcon(sImgURL, ["classA", "classB"], {
			id: "img1",
			propertyA: "valueA",
			propertyB: "valueB"
		});
		rm.flush(jQuery.sap.domById("area7"));
		rm.destroy();

		var $img1 = jQuery.sap.byId("img1");
		assert.ok($img1[0], "icon should be rendered");
		assert.ok($img1.is("img"), "Image URI should be rendered as a img");
		assert.ok($img1.hasClass("classA"), "img has classA as a CSS class");
		assert.ok($img1.hasClass("classB"), "img has classB as a CSS class");
		assert.equal($img1.attr("propertyA"), "valueA", "Attribute should be set");
		assert.equal($img1.attr("propertyB"), "valueB", "Attribute should be set");
		assert.equal($img1.attr("role"), "presentation", "Default attribute should be set");
		assert.equal($img1.attr("alt"), "", "Default attribute should be set");

		jQuery.sap.byId("area7").empty();

		rm = sap.ui.getCore().createRenderManager();
		rm.writeIcon(sImgURL, ["classA", "classB"], {
			id: "img1",
			role: "",
			alt: "test alt message"
		});
		rm.flush(jQuery.sap.domById("area7"));
		rm.destroy();

		$img1 = jQuery.sap.byId("img1");
		assert.ok($img1[0], "icon should be rendered");
		assert.ok($img1.is("img"), "Image URI should be rendered as a img");
		assert.ok($img1.hasClass("classA"), "img has classA as a CSS class");
		assert.ok($img1.hasClass("classB"), "img has classB as a CSS class");
		assert.equal($img1.attr("role"), "", "Attribute should be changed");
		assert.equal($img1.attr("alt"), "test alt message", "Attribute should be changed");
	});

	QUnit.test("RenderManager should not break for controls with invalid renderer", function(assert) {

		var Log = sap.ui.require("sap/base/Log");
		assert.ok(Log, "Log module should be available");

		// define a control without an invalid renderer
		var my = {};
		my.InvalidRendererControl = Control.extend("my.InvalidRendererControl", {
			renderer: {}
		});

		// create a new instance of the control
		var oControl = new my.InvalidRendererControl();
		var oMetadata = oControl.getMetadata();
		var oRenderer = oControl.getRenderer();

		// check for an invalid renderer (preconditions)
		assert.ok(!!oRenderer, "A renderer object should be provided");
		assert.ok(!oRenderer.render, "Invalid renderer should not provide a render function");

		// spy the jQuery.sap.log.error function
		var oSpy = sinon.spy(Log, "error");

		// rendering should not lead to an error
		oControl.placeAt("area8");
		sap.ui.getCore().applyChanges();
		oControl.destroy();

		// check the error message
		assert.equal("The renderer for class " + oMetadata.getName() + " is not defined or does not define a render function! Rendering of " + oControl.getId() + " will be skipped!", oSpy.getCall(0).args[0], "Error should be reported in the console!");

		// restore the spy
		oSpy.restore();

	});



	QUnit.module("Events", {
		beforeEach: function() {
			this.oElement = document.createElement("div");
			this.oSpy = sinon.spy();
			this.oContext = {};
		},
		afterEach: function() {
			RenderManager.detachPreserveContent(this.oSpy);
		}
	});

	QUnit.test("preserveContent", function(assert) {
		RenderManager.attachPreserveContent(this.oSpy);
		RenderManager.preserveContent(this.oElement);
		sinon.assert.calledOnce(this.oSpy);
		sinon.assert.calledWith(this.oSpy, {
			domNode: this.oElement
		});
		sinon.assert.calledOn(this.oSpy, RenderManager);
		this.oSpy.reset();

		RenderManager.detachPreserveContent(this.oSpy);
		RenderManager.preserveContent(this.oElement);
		sinon.assert.notCalled(this.oSpy);
	});

	QUnit.test("preserveContent with context", function(assert) {
		RenderManager.attachPreserveContent(this.oSpy, this.oContext);
		RenderManager.preserveContent(this.oElement);
		sinon.assert.calledOnce(this.oSpy);
		sinon.assert.calledWith(this.oSpy, {
			domNode: this.oElement
		});
		sinon.assert.calledOn(this.oSpy, this.oContext);
	});

	QUnit.test("preserveContent duplicate listener", function(assert) {
		RenderManager.attachPreserveContent(this.oSpy);
		RenderManager.preserveContent(this.oElement);
		sinon.assert.calledOnce(this.oSpy);
		this.oSpy.reset();

		RenderManager.attachPreserveContent(this.oSpy, this.oContext);
		RenderManager.preserveContent(this.oElement);
		sinon.assert.calledOnce(this.oSpy);
		sinon.assert.calledOn(this.oSpy, this.oContext);
	});

});