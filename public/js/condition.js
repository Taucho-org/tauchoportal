/**
 * ConditionEditor - Reusable condition logic editor class
 * Handles JSON editing, rendering, and synchronization across multiple textarea/form elements
 * 
 * Matches the behavior of the original jsonLoader and summarize functions,
 * now in a class-based reusable format that works with any textarea element.
 */
class ConditionEditor {
    constructor(conditionInputElement, options = {}) {
        // Validation
        if (!conditionInputElement) {
            throw new Error('conditionInputElement is required');
        }
        if (typeof conditionInputElement === 'string') {
            conditionInputElement = document.getElementById(conditionInputElement);
        }
        if (!conditionInputElement) {
            throw new Error('conditionInputElement not found in DOM');
        }

        this.conditionInput = conditionInputElement;
        this.baseType = options.baseType || 'OR';
        this.drawingArea = options.drawingArea || document.getElementById('drawingArea');
        this.logicDescriptionArea = options.logicDescriptionArea;
        this.platform = options.platform || '';
        this.eventType = options.eventType || '';
        this.eventFieldOptions = Array.isArray(options.eventFieldOptions) ? options.eventFieldOptions : [];
        this.onRefresh = typeof options.onRefresh === 'function' ? options.onRefresh : null;
        try{
            const parsedValue = JSON.parse(this.conditionInput.value);
            if (!parsedValue.Operator) {
                this.conditionInput.value = JSON.stringify({ "Operator": this.baseType, "SubConditions": parsedValue.Subconditions, "Variables": parsedValue.Variables }, null, 2);
            }
        } catch {
            this.conditionInput.value = JSON.stringify({ "Operator": this.baseType, "SubConditions": [], "Variables": [] }, null, 2);
        }

        // Store reference to operator/naming maps
        this.extractionoperators = ["PARAM"];
        this.booleanoperators = ["AND", "OR", "NOT", "SOME"];
        this.compoperators = ["EQUIVALENT", "GREATER_THAN", "GREATER_OR_EQUAL", "LESS_THAN", "LESS_OR_EQUAL"];
        this.textoperators = ["EQUALS", "INCLUDES", "REGEX_MATCH"];
        this.textextractors = ["WHOLESENTENCE", "REGEX_EXTRACT", "SUBSTRING", "FIRST", "LAST"];
        this.groupoperators = ["COUNT", "SUM"];
        this.calcoperators = ["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "MODULO"];
        this.convoperators = ["PARSEINT", "EXCHANGE", "COLOR_PICKUP"];
        this.operatorswithrange = ["INCLUDES", "SUBSTRING"];

        this.namingmap = {"AND": "and", "OR": "or", "NOT": "not", "SOME": "some", "EQUIVALENT": "equivalent", "GREATER_THAN": "greater_than", "GREATER_OR_EQUAL": "greater_or_equal", "LESS_THAN": "less_than", "LESS_OR_EQUAL": "less_or_equal", "EQUALS": "equals", "INCLUDES": "includes", "REGEX_MATCH": "regex_match", "COUNT": "count", "SUM": "sum", "WHOLESENTENCE": "wholesentence", "REGEX_EXTRACT": "regex_extract", "SUBSTRING": "substring", "FIRST": "first", "LAST": "last", "ADD": "add", "SUBTRACT": "subtract", "MULTIPLY": "multiply", "DIVIDE": "divide", "MODULO": "modulo", "PARSEINT": "parseint", "COLOR_PICKUP": "color_pickup", "PARAM": "param" };
        this.operatormap = { "and": "AND", "or": "OR", "not": "NOT", "some": "SOME", "equivalent": "EQUIVALENT", "greater_than": "GREATER_THAN", "greater_or_equal": "GREATER_OR_EQUAL", "less_than": "LESS_THAN", "less_or_equal": "LESS_OR_EQUAL", "equals": "EQUALS", "includes": "INCLUDES", "regex_match": "REGEX_MATCH", "count": "COUNT", "sum": "SUM", "wholesentence": "WHOLESENTENCE", "regex_extract": "REGEX_EXTRACT", "substring": "SUBSTRING", "first": "FIRST", "last": "LAST", "add": "ADD", "subtract": "SUBTRACT", "multiply": "MULTIPLY", "divide": "DIVIDE", "modulo": "MODULO", "parseint": "PARSEINT", "exchange": "EXCHANGE", "color_pickup": "COLOR_PICKUP", "param": "PARAM" };
        this.reverselookuptype = { "AND": "boolean", "OR": "boolean", "NOT": "boolean", "SOME": "boolean", "EQUIVALENT": "comp", "GREATER_THAN": "comp", "LESS_THAN": "comp", "EQUALS": "optext", "INCLUDES": "optext", "REGEX_MATCH": "optext", "COUNT": "group", "SUM": "group", "ADD": "calc", "SUBTRACT": "calc", "MULTIPLY": "calc", "DIVIDE": "calc", "MODULO": "calc", "PARSEINT": "conv", "EXCHANGE": "conv", "COLOR_PICKUP": "conv", "PARAM": "extract" }; 
        this.calcoperatorssign = {"ADD": "＋", "SUBTRACT": "－", "MULTIPLY": "×", "DIVIDE": "÷", "MODULO": "≡"};
        this.textextractorlabels = {"WHOLESENTENCE": "Whole Sentence", "REGEX_EXTRACT": "Regex Extract", "SUBSTRING": "Substring", "FIRST": "First", "LAST": "Last"};
        // Initialize boolean dialog handler
        this.boolDialog = new BoolDialogHandler(this);
        
        // Initialize text condition dialog handler
        this.textDialog = new TextDialogHandler(this);
        
        // Initialize range dialog handler
        this.rangeDialog = new RangeDialogHandler(this);
        
        // Initialize text condition dialog handler
        this.textConditionDialog = new TextConditionDialogHandler(this);
        
        // Initialize numeric dialog handler
        this.numericDialog = new NumericDialogHandler(this);

        // Setup change listener to sync between textarea and drawing area
        this.conditionInput.addEventListener('change', this.refresh.bind(this));
    }

    /**
     * Get JSON from textarea
     */
    getJSON() {
        try {
            return JSON.parse(this.conditionInput.value);
        } catch (e) {
            console.error('Failed to parse JSON from condition input:', e);
            return null;
        }
    }

    /**
     * Update JSON in textarea and refresh drawing area
     */
    setJSON(json) {
        this.conditionInput.value = JSON.stringify(json, null, 2);
        this.refresh();
    }

    /**
     * Refresh the drawing area and description from current JSON
     */
    refresh() {
        try {
            const json = this.getJSON();
            if (!json) {
                if (this.logicDescriptionArea) {
                    this.logicDescriptionArea.innerHTML = '';
                }
                if (this.drawingArea) {
                    this.drawingArea.replaceChildren();
                }
                return;
            }

            // Render drawing area - pass the area directly, matches original jsonLoader
            if (this.drawingArea) {
                this._jsonLoader(json, this.drawingArea);
            }

            // Render description
            const summaryHtml = this._summarize(json) || '';
            if (this.logicDescriptionArea) {
                this.logicDescriptionArea.innerHTML = summaryHtml;
            }
        } catch (e) {
            console.error('Error refreshing condition editor:', e);
            if (this.logicDescriptionArea) {
                this.logicDescriptionArea.innerHTML = '<div class="jsonerror">' + (translations?.failedjsonparse || 'Failed to parse JSON') + '</div>';
            }
            if (this.drawingArea) {
                this.drawingArea.replaceChildren();
                const jsonerror = document.createElement("div");
                jsonerror.classList.add("jsonerror");
                jsonerror.innerText = translations?.failedjsonparse || 'Failed to parse JSON';
                this.drawingArea.append(jsonerror);
            }
        }
    }

    addTemplate(templateJSONString) {
        let templateJSON;
        try {
            templateJSON = JSON.parse(templateJSONString);
        } catch (e) {
            console.error('Error parsing template JSON:', e);
            return false;
        }

        const json = this.getJSON() || { "Operator": this.baseType, "SubConditions": [], "Variables": [] };
        if (!Array.isArray(json.SubConditions)) {
            json.SubConditions = [];
        }
        json.SubConditions.push(JSON.parse(JSON.stringify(templateJSON)));
        this.setJSON(json);
        return true;
    }

    openQuickOperatorDialog(operatorType) {
        const json = this.getJSON() || { "Operator": this.baseType, "SubConditions": [], "Variables": [] };
        if (!Array.isArray(json.SubConditions)) {
            json.SubConditions = [];
        }
        const insertPath = `0/${json.SubConditions.length}`;
        const fakeTarget = {
            getAttribute: (attribute) => {
                if (attribute === "path") return insertPath;
                if (attribute === "operator") return json.Operator || this.baseType;
                return null;
            }
        };

        this.boolDialog.open({ target: fakeTarget });
        document.getElementById("boolconditionradio").checked = true;
        document.getElementById("booltextradio").checked = false;
        document.getElementById("boolnumericradio").checked = false;
        document.getElementById("boolmodal_bool").classList.add("available");
        document.getElementById("boolmodal_text").classList.remove("available");
        document.getElementById("boolmodal_numeric").classList.remove("available");
        document.getElementById("boolcondition").value = operatorType;
        this.boolDialog.validate();
    }

    /**
     * Render JSON node into DOM area - matches original jsonLoader behavior
     * @private
     */
    _jsonLoader(jsonnode, area, path = "0") {
        path = path ?? "0";
        const operator = jsonnode.Operator;
        area.replaceChildren();

        const legendtag = document.createElement("legend");
        legendtag.innerText = translations[jsonnode.Operator] || jsonnode.Operator;
        area.appendChild(legendtag);

        const editarea = document.createElement("div");
        editarea.classList.add("icons");

        const edittag = document.createElement("a");
        edittag.classList.add("edit");
        edittag.innerText = "✏️";
        edittag.setAttribute("path", path);
        edittag.setAttribute("operator", jsonnode.Operator);
        edittag.onclick = (e) => this._editItem(e);
        editarea.appendChild(edittag);

        const removetag = document.createElement("a");
        removetag.classList.add("remove");
        removetag.innerText = "🗑️";
        removetag.setAttribute("path", path);
        removetag.setAttribute("operator", jsonnode.Operator);
        removetag.onclick = (e) => this._deleteItem(e);
        editarea.appendChild(removetag);
        area.appendChild(editarea);

        area.classList.add(this.namingmap[jsonnode.Operator]);

        if (operator == "SOME") {
            const somefield = document.createElement("div");
            const prefix = document.createElement("span");
            prefix.innerText = translations["some-sentense_prefix"] == undefined ? "Some" : translations["some-sentense_prefix"];
            somefield.append(prefix);
            const frombutton = document.createElement("input");
            frombutton.type = "number";
            frombutton.inputmode = "numeric";
            frombutton.min = 1;
            frombutton.max = 999;
            frombutton.pattern = "[0-9]*";
            frombutton.classList.add("numerictext");
            frombutton.style["display"] = "inline-block";
            frombutton.setAttribute("path", path);
            frombutton.value = jsonnode.Variables && jsonnode.Variables.length > 0 ? jsonnode.Variables[0].split("-")[0] : "";
            somefield.append(frombutton);
            const joint = document.createElement("span");
            joint.innerText = translations["some-sentense_joint"] == undefined ? "to" : translations["some-sentense_joint"];
            somefield.append(joint);
            const tobutton = document.createElement("input");
            tobutton.type = "number";
            tobutton.inputmode = "numeric";
            tobutton.min = 1;
            tobutton.max = 999;
            tobutton.pattern = "[0-9]*";
            tobutton.classList.add("numerictext");
            tobutton.style["display"] = "inline-block";
            tobutton.value = jsonnode.Variables && jsonnode.Variables.length > 0 && jsonnode.Variables[0].indexOf("-") ? jsonnode.Variables[0].split("-")[1] : "";
            somefield.append(tobutton);
            const suffix = document.createElement("span");
            suffix.innerText = translations["some-sentense_suffix"] == undefined ? "conditions" : translations["some-sentense_suffix"];
            somefield.append(suffix);
            area.append(somefield);
        }

        // Only for non-top-level (has "/"), show summary
        if (path.split("/").length > 1) {
            const summarized = document.createElement("div");
            summarized.classList.add("summary");
            if (jsonnode.SubConditions) {
                summarized.innerHTML = this._summarize(jsonnode);
            }
            area.appendChild(summarized);
        }

        const detailarea = document.createElement("div");
        detailarea.classList.add("detailarea");
        if (jsonnode.SubConditions && jsonnode.SubConditions.length) {
            const subconarea = document.createElement("div");
            subconarea.classList.add("subcondition");
            for (const is in jsonnode.SubConditions) {
                const childarea = document.createElement("fieldset");
                childarea.classList.add("item");
                if (path.indexOf("/") < 1) {
                    childarea.onclick = function () { this.classList.toggle("focus") }
                }
                this._jsonLoader(jsonnode.SubConditions[is], childarea, path + "/" + is);
                subconarea.append(childarea);
            }
            detailarea.appendChild(subconarea);
        }
        if (jsonnode.Variables) {
            for (const iv in jsonnode.Variables) {
                const variableitem = document.createElement("div");
                variableitem.classList.add("variable");
                if (this.operatorswithrange.includes(operator) && iv > 0) {
                    variableitem.classList.add("range");
                }
                variableitem.innerText = jsonnode.Variables[iv];
                if (jsonnode.Operator != "PARAM") {
                    variableitem.setAttribute("operator", "_variable");
                    variableitem.setAttribute("path", path);
                    variableitem.setAttribute("index", iv);
                    variableitem.onclick = (e) => this._editItem(e);
                }
                detailarea.appendChild(variableitem);
            }
        }
        area.appendChild(detailarea);

        if (this.booleanoperators.includes(operator)) {
            if (operator != "NOT" || !jsonnode.SubConditions || jsonnode.SubConditions.length < 1) {
                const addbutton = document.createElement("div");
                addbutton.classList.add("addbutton");
                addbutton.innerText = "+";
                addbutton.setAttribute("path", path + "/" + (jsonnode.SubConditions ? jsonnode.SubConditions.length : "0"));
                addbutton.setAttribute("operator", operator);
                addbutton.onclick = (e) => this.boolDialog.open(e);
                area.append(addbutton);
            }
        } else if (this.compoperators.includes(operator) && (
            ((jsonnode.Variables?.length || 0) + (jsonnode.SubConditions?.length || 0)) < 2
        )) {
            const addcompbutton = document.createElement("div");
            addcompbutton.classList.add("addcompbutton");
            addcompbutton.innerText = "+";
            addcompbutton.setAttribute("path", path);
            addcompbutton.setAttribute("operator", operator);
            addcompbutton.onclick = this.numericDialog.open.bind(this.numericDialog);
            area.append(addcompbutton);
        } else if (this.textoperators.includes(operator)) {
            if (!jsonnode.SubConditions || jsonnode.SubConditions.length < 1) {
                const askenvbutton = document.createElement("div");
                askenvbutton.classList.add("askenvbutton");
                askenvbutton.innerText = "+";
                askenvbutton.setAttribute("path", path);
                askenvbutton.setAttribute("operator", operator);
                askenvbutton.onclick = function(){this.textDialog.open(null, null, null, null, true, false, function(disp,val,type,exttype,extval){
                    const parentjson = this.getJSON();
                    const currentnode = this._getSubCondition(parentjson, path);
                    if (type === "env") {
                        currentnode.SubConditions = [];
                        currentnode.SubConditions.push({"Operator": this.operatormap[exttype], "Variables": [extval],"SubConditions": [{"Operator": "PARAM", "Variables": [val],"SubConditions": null}]});
                    } else if (type == "variable") {
                        currentnode.Variables = [];
                        currentnode.Variables.push(val);
                    }
                    this.setJSON(parentjson);
                }.bind(this))}.bind(this);
                area.append(askenvbutton);
            }
            if (!jsonnode.Variables || !jsonnode.Variables.length) {
                const inputtextbutton = document.createElement("div");
                inputtextbutton.classList.add("inputtextbutton");
                inputtextbutton.innerText = "+";
                inputtextbutton.setAttribute("path", path);
                inputtextbutton.setAttribute("operator", operator);
                inputtextbutton.onclick = function(){this.textDialog.open(null, null, null, null, true, true, function(disp,val,type,exttype,extval){
                    const parentjson = this.getJSON();
                    const currentnode = this._getSubCondition(parentjson, path);
                    if (type === "env") {
                        currentnode.SubConditions = [];
                        currentnode.SubConditions.push({"Operator": this.operatormap[exttype], "Variables": [extval],"SubConditions": [{"Operator": "PARAM", "Variables": [val],"SubConditions": null}]});
                    } else if (type == "variable") {
                        currentnode.Variables = [];
                        currentnode.Variables.push(val);
                    }
                    this.setJSON(parentjson);
                }.bind(this))}.bind(this);
                area.append(inputtextbutton);
            }
        } else if (this.calcoperators.includes(operator)) {
            const inputnumbutton = document.createElement("div");
            inputnumbutton.classList.add("asknumbutton");
            inputnumbutton.innerText = "+";
            inputnumbutton.setAttribute("path", path);
            inputnumbutton.setAttribute("operator", operator);
            const currentObj = this;
            inputnumbutton.onclick = function() {
                this.open(currentObj);
            }.bind(this.numericDialog);
            area.append(inputnumbutton);
        } else if (this.textextractors.includes(operator)) {
            if ((!jsonnode.SubConditions || jsonnode.SubConditions.length < 1) && (!jsonnode.Variables || jsonnode.Variables.length < 1)) {
                const inputtextbutton = document.createElement("div");
                inputtextbutton.classList.add("inputtextbutton");
                inputtextbutton.innerText = "+";
                inputtextbutton.setAttribute("path", path);
                inputtextbutton.setAttribute("operator", operator);
                inputtextbutton.onclick = function(){this.textDialog.open(null, null, null, null, true, true, function(disp,val,type,exttype,extval){
                    const parentjson = this.getJSON();
                    const currentnode = this._getSubCondition(parentjson, path);
                    if (type === "env") {
                        currentnode.SubConditions = [];
                        currentnode.SubConditions.push({"Operator": this.operatormap[exttype], "Variables": [extval],"SubConditions": [{"Operator": "PARAM", "Variables": [val],"SubConditions": null}]});
                    } else if (type == "variable") {
                        currentnode.Variables = [];
                        currentnode.Variables.push(val);
                    }
                    this.setJSON(parentjson);
                }.bind(this))}.bind(this);
                area.append(inputtextbutton);
            }
        } else if ((this.extractionoperators.includes(operator) ||
            this.textoperators.includes(operator) ||
            this.convoperators.includes(operator))
            && !jsonnode.Variables && (!jsonnode.SubConditions || operator != "PARSEINT")
        ) {
            const inputtextbutton = document.createElement("div");
            inputtextbutton.classList.add("inputtextbutton");
            inputtextbutton.innerText = "?";
            inputtextbutton.setAttribute("path", path);
            inputtextbutton.setAttribute("operator", operator);
            inputtextbutton.onclick = function(){this.textDialog.open(null, null, null, null, true, true, function(disp,val,type,exttype,extval){
                const parentjson = this.getJSON();
                const currentnode = this._getSubCondition(parentjson, path);
                if (type === "env") {
                    currentnode.SubConditions = [];
                    currentnode.SubConditions.push({"Operator": this.operatormap[exttype], "Variables": [extval],"SubConditions": [{"Operator": "PARAM", "Variables": [val],"SubConditions": null}]});
                } else if (type == "variable") {
                    currentnode.Variables = [];
                    currentnode.Variables.push(val);
                }
                this.setJSON(parentjson);
            }.bind(this))}.bind(this);
            area.append(inputtextbutton);
        }
    }

    /**
     * Summarize JSON node into human-readable format - matches original summarize behavior
     * @private
     */
    _summarize(node) {
        if (!node) return null;

        switch (node.Operator) {
            case "AND":
                const items_and = [];
                if (node.SubConditions) {
                    for (const i in node.SubConditions) {
                        items_and.push("<span class='or'>" + this._summarize(node.SubConditions[i]) + "</span>");
                    }
                }
                if (items_and.length) {
                    return items_and.join(translations["and-joint"]);
                } else {
                    return translations["and-notset"];
                }
                break;
            case "OR":
                const items_or = [];
                if (node.SubConditions) {
                    for (const i in node.SubConditions) {
                        items_or.push("<span class='or'>" + this._summarize(node.SubConditions[i]) + "</span>");
                    }
                }
                if (items_or.length) {
                    return items_or.join(translations["or-joint"]);
                } else {
                    return translations["or-notset"];
                }
                break;
            case "NOT":
                const items_not = [];
                if (node.SubConditions) {
                    for (const i in node.SubConditions) {
                        items_not.push("<span class='or'>" + this._summarize(node.SubConditions[i]) + "</span>");
                    }
                }
                if (items_not.length) {
                    return translations["not-sentense"].replace("{0}", items_not.join(translations["or-joint"]));
                }else {
                    return translations["not-notset"];
                }
                break;
            case "SOME":
                const items_some = [],
                    range_some_from = node.Variables&&node.Variables[0]?parseInt(node.Variables[0].split("-")[0]):null,
                    range_some_to = node.Variables&&node.Variables[0]&&node.Variables[0].split("-").length>1?parseInt(node.Variables[0].split("-")[1]):null;
                for (const i in node.SubConditions) {
                    items_some.push("<span class='or'>" + this._summarize(node.SubConditions[i]) + "</span>");
                }
                if (items_some.length) {
                    if (!range_some_from&&!range_some_to || range_some_from==1&&!range_some_to) {
                        return translations["some-notset"];
                    } else if (range_some_from&&!range_some_to) {
                        return translations["some-sentense_from"].replace("{0}", items_some.join(translations["or-joint"])).replace("{1}", range_some_from);
                    } else if (!range_some_from&&range_some_to) {
                        return translations["some-sentense_to"].replace("{0}", items_some.join(translations["or-joint"])).replace("{1}", range_some_to);
                    } else if (range_some_from&&range_some_to) {
                        return translations["some-sentense_fromto"].replace("{0}", items_some.join(translations["or-joint"])).replace("{1}", range_some_from).replace("{2}", range_some_to);
                    }
                    return translations["some-sentense"].replace("{0}", items_some.join(translations["or-joint"]));
                }else {
                    return translations["some-notset"];
                }
                break;
            case "EQUIVALENT":
                const items_equivalent = [];
                for (const i in node.SubConditions) {
                    items_equivalent.push(this._summarize(node.SubConditions[i]));
                }
                for (const i in node.Variables) {
                    items_equivalent.push("<span class='static'>" + translations["staticvalue"].replace("{0}", node.Variables[i]) + "</span>");
                }
                if (!items_equivalent.length) {
                    return "<span class='novalue'>" + translations["equivalent-novalue"] + "</span>";
                } else if (items_equivalent.length == 1) {
                    items_equivalent.push("<span class='missingvalue'>" + translations["equivalent-missingvalue"] + "</span>");
                    return translations["equivalent-sentense"].replace("{0}", items_equivalent.join(translations["equivalent-joint"]));
                } else {
                    return translations["equivalent-sentense"].replace("{0}", items_equivalent.join(translations["equivalent-joint"]));
                }
                break;
            case "GREATER_THAN":
            case "GREATER_OR_EQUAL":
            case "LESS_THAN":
            case "LESS_OR_EQUAL":
                let target_compare;
                const items_compare = [];
                const sentense = 
                    node.Operator=="GREATER_THAN"?"greaterthan-sentense":
                    node.Operator=="GREATER_OR_EQUAL"?"greaterorequal-sentense":
                    node.Operator=="LESS_THAN"?"lessthan-sentense":
                    node.Operator=="LESS_OR_EQUAL"?"lessorequal-sentense":"";
                if (node.SubConditions.length>0) {
                    target_compare = this._summarize(node.SubConditions[0]);
                    for (const i in node.SubConditions.slice(1)) {
                        items_compare.push(this._summarize(node.SubConditions.slice(1)[i]));
                    }
                } else {
                    target_compare = "<span class='novalue'>" + translations["compare-missingvalue"] + "</span>";
                }
                for (const i in node.Variables) {
                    items_compare.push("<span class='static'>" + translations["staticvalue"].replace("{0}", node.Variables[i]) + "</span>");
                }
                if (!items_compare.length) {
                    items_compare.push("<span class='novalue'>" + translations["compare-novalue"] + "</span>");
                }
                return translations[sentense].replace("{0}", target_compare).replace("{1}", items_compare.join(translations["equals-joint"]));
                break;
            case "EQUALS":
                const items_equals = [];
                for (const i in node.SubConditions) {
                    items_equals.push(this._summarize(node.SubConditions[i]));
                }
                for (const i in node.Variables) {
                    items_equals.push("<span class='static'>" + translations["staticvalue"].replace("{0}", node.Variables[i]) + "</span>");
                }
                if (!items_equals.length) {
                    return "<span class='novalue'>" + translations["equals-novalue"] + "</span>";
                } else if (items_equals.length == 1) {
                    items_equals.push("<span class='missingvalue'>" + translations["equals-missingvalue"] + "</span>");
                    return translations["equals-sentense"].replace("{0}", items_equals.join(translations["equals-joint"]));
                } else {
                    return translations["equals-sentense"].replace("{0}", items_equals.join(translations["equals-joint"]));
                }
                break;
            case "INCLUDES":
                let target_includes;
                let range_includes_from = "";
                let range_includes_to = "";
                const items_includes = [];
                if (node.SubConditions && node.SubConditions.length > 0) {
                    target_includes = this._summarize(node.SubConditions[0]);
                    for (const i in node.SubConditions.slice(1)) {
                        items_includes.push(translations["staticvalue"].replace("{0}", this._summarize(node.SubConditions[i])));
                    }
                } else {
                    target_includes = "<span class='novalue'>" + translations["includes-novalue"] + "</span>";
                }
                if (node.Variables.length > 0) {
                    items_includes.push("<span class='static'>" + translations["staticvalue"].replace("{0}", node.Variables[0]) + "</span>");
                }
                if (node.Variables.length > 1) {
                    if (node.Variables[1].split("-")[0]&&parseInt(node.Variables[1].split("-")[0])) {
                        range_includes_from = parseInt(node.Variables[1].split("-")[0]);
                    }
                    if (node.Variables[1].split("-")[0]&&node.Variables[1].split("-").length>1&&parseInt(node.Variables[1].split("-")[1])){
                        range_includes_to = parseInt(node.Variables[1].split("-")[1]);
                    }
                }
                let comparar;
                if (items_includes?.length) {
                    comparar = items_includes.join(translations["valueof-joint"]);
                } else {
                    comparar = "<span class='novalue'>" + translations["includes-missingvalue"] + "</span>";
                }
                if (!range_includes_from&&!range_includes_to || range_includes_from==1&&!range_includes_to) {
                    return translations["includes-sentense-one"].replace("{0}", target_includes).replace("{1}", comparar);
                } else if (range_includes_from&&!range_includes_to) {
                    return translations["includes-sentense-rangefrom"].replace("{0}", target_includes).replace("{1}", comparar).replace("{2}", range_includes_from);
                } else if (!range_includes_from&&range_includes_to) {
                    return translations["includes-sentense-rangeto"].replace("{0}", target_includes).replace("{1}", comparar).replace("{2}", range_includes_to);
                } else if (range_includes_from&&range_includes_to) {
                    return translations["includes-sentense-rangefromto"].replace("{0}", target_includes).replace("{1}", comparar).replace("{2}", range_includes_from).replace("{3}", range_includes_to);
                }
                break;
            case "REGEX_MATCH":
                const items_regex = [];
                const regexs = [];
                for (const i in node.SubConditions) {
                    items_regex.push(this._summarize(node.SubConditions[i]));
                }
                for (const i in node.Variables) {
                    regexs.push("<span class='regexparam'>" + translations["regexparam"].replace("{0}", node.Variables[i]) + "</span>");
                }
                let target_regex;
                if (items_regex.length) {
                    target_regex = items_regex.join(translations["valueof-joint"]);
                } else {
                    target_regex = "<span class='novalue'>" + translations["regex-missingvalue"] + "</span>";
                }
                let regex;
                if (regexs.length) {
                    regex = regexs.join(translations["valueof-joint"]);
                } else {
                    regex = "<span class='novalue'>" + translations["regex-missingvalue"] + "</span>";
                }
                
                return translations["regex-sentense"].replace("{0}", target_regex).replace("{1}", regex);
                break;
            case "WHOLESENTENCE":
                const items_whole = [];
                for (const i in node.SubConditions) {
                    items_whole.push(this._summarize(node.SubConditions[i]));
                }
                for (const i in node.Variables) {
                    items_whole.push(node.Variables[i]);
                }
                return translations["textextract-whole"].replace("{0}", items_whole.join(translations["valueof-joint"]));
                break;
            case "REGEX_EXTRACT":
                const items_regex_extract = [];
                const regexs_extract = [];
                for (const i in node.SubConditions) {
                    items_regex_extract.push(this._summarize(node.SubConditions[i]));
                }
                for (const i in node.Variables) {
                    regexs_extract.push("<span class='regexparam'>" + node.Variables[i] + "</span>");
                }
                let target_regex_extract;
                if (items_regex_extract.length) {
                    target_regex_extract = items_regex_extract.join(translations["valueof-joint"]);
                } else {
                    target_regex_extract = "<span class='novalue'>" + translations["regex-missingvalue"] + "</span>";
                }
                let regex_extract;
                if (regexs_extract.length) {
                    regex_extract = regexs_extract.join(translations["valueof-joint"]);
                } else {
                    regex_extract = "<span class='novalue'>" + translations["regex-missingvalue"] + "</span>";
                }
                
                return translations["textextract-regex"].replace("{0}", target_regex_extract).replace("{1}", regex_extract);
                break;
            case "SUBSTRING":
                let target_substring;
                let range_substring_from = "";
                let range_substring_to = "";
                const items_substring = [];
                if (node.SubConditions&&node.SubConditions.length>0) {
                    target_substring = this._summarize(node.SubConditions[0]);
                    for (const i in node.SubConditions.slice(1)) {
                        items_substring.push(this._summarize(node.SubConditions[i]));
                    }
                } else {
                    target_substring = "<span class='novalue'>" + translations["textextract-sub_missingvalue"] + "</span>";
                }
                for (const i in node.Variables) {
                    items_substring.push(node.Variables[i]);
                }
                if (items_substring.length > 0) {
                    if (items_substring[0].split("-")&&parseInt(items_substring[0].split("-")[0])) {
                        range_substring_from = parseInt(items_substring[0].split("-")[0]);
                    }
                    if (items_substring[0].split("-")&&items_substring[0].split("-").length>1&&parseInt(items_substring[0].split("-")[1])){
                        range_substring_to = parseInt(items_substring[0].split("-")[1]);
                    }
                }
                if (!range_substring_from&&!range_substring_to) {
                    return translations["textextract-sub_missingvalue"];
                } else if (range_substring_from&&!range_substring_to) {
                    return translations["textextract-sub_from"].replace("{0}", target_substring).replace("{1}", range_substring_from);
                } else if (!range_substring_from&&range_substring_to) {
                    return translations["textextract-sub_to"].replace("{0}", target_substring).replace("{1}", range_substring_to);
                } else if (range_substring_from&&range_substring_to) {
                    return translations["textextract-sub_fromto"].replace("{0}", target_substring).replace("{1}", range_substring_from).replace("{2}", range_substring_to);
                }
                break;
            case "FIRST":
                let target_first;
                const items_first = [];
                let length_first;
                if (node.SubConditions.length>0) {
                    target_first = this._summarize(node.SubConditions[0]);
                    for (const i in node.SubConditions.slice(1)) {
                        items_first.push(this._summarize(node.SubConditions[i]));
                    }
                } else {
                    target_first = "<span class='novalue'>" + translations["textextract-sub_missingvalue"] + "</span>";
                }
                for (const i in node.Variables) {
                    items_first.push(node.Variables[i]);
                }
                length_first = parseInt(items_first[0]);
                if (!length_first) {
                    return translations["textextract-sub_missingvalue"];
                } else {
                    return translations["textextract-first"].replace("{0}", target_first).replace("{1}", length_first);
                }
                break;
            case "LAST":
                let target_last;
                const items_last = [];
                let length_last;
                if (node.SubConditions.length>0) {
                    target_last = this._summarize(node.SubConditions[0]);
                    for (const i in node.SubConditions.slice(1)) {
                        items_last.push(this._summarize(node.SubConditions[i]));
                    }
                } else {
                    target_last = "<span class='novalue'>" + translations["textextract-sub_missingvalue"] + "</span>";
                }
                for (const i in node.Variables) {
                    items_last.push(node.Variables[i]);
                }
                length_last = parseInt(items_last[0]);
                if (!length_last) {
                    return translations["textextract-sub_missingvalue"];
                } else {
                    return translations["textextract-last"].replace("{0}", target_last).replace("{1}", length_last);
                }
                break;
            case "ADD":
                const items_add = [];
                for (const i in node.SubConditions) {
                    items_add.push(this._summarize(node.SubConditions[i]));
                }
                for (const i in node.Variables) {
                    items_add.push(node.Variables[i]);
                }
                if (items_add.length) {
                    return items_add.join(translations["plus-joint"]);
                } else {
                    return translations["calc-missingvalue"];
                }
                break;
            case "SUBTRACT":
                let orig_subtract;
                const items_subtract = [];
                if (node.SubConditions.length>0) {
                    orig_subtract = this._summarize(node.SubConditions[0]);
                    for (const i in node.SubConditions.slice(1)) {
                        items_subtract.push(this._summarize(node.SubConditions[i]));
                    }
                } else {
                    orig_subtract = translations["calc-missingvalue"];
                }
                for (const i in node.Variables) {
                    items_subtract.push(node.Variables[i]);
                }
                if (items_subtract.length) {
                    return orig_subtract + translations["subtract-joint"] + items_subtract.join(translations["subtract-joint"]);
                } else {
                    return orig_subtract + translations["subtract-joint"] + translations["calc-missingvalue"];
                }
                break;
            case "MULTIPLY":
                const items_multiply = [];
                for (const i in node.SubConditions) {
                    items_multiply.push(this._summarize(node.SubConditions[i]));
                }
                for (const i in node.Variables) {
                    items_multiply.push(node.Variables[i]);
                }
                if (items_multiply.length) {
                    return items_multiply.join(translations["multiply-joint"]);
                } else {
                    return translations["calc-missingvalue"];
                }
                break;
            case "DIVIDE":
                let orig_divide;
                const items_divide = [];
                if (node.SubConditions.length>0) {
                    orig_divide = this._summarize(node.SubConditions[0]);
                    for (const i in node.SubConditions.slice(1)) {
                        items_divide.push(this._summarize(node.SubConditions[i]));
                    }
                } else {
                    orig_divide = translations["calc-missingvalue"];
                }
                for (const i in node.Variables) {
                    items_divide.push(node.Variables[i]);
                }
                if (items_divide.length) {
                    return orig_divide + translations["divide-joint"] + items_divide.join(translations["subtract-joint"]);
                } else {
                    return orig_divide + translations["divide-joint"] + translations["calc-missingvalue"];
                }
                break;
            case "MODULO":
                let orig_modulo;
                const items_modulo = [];
                if (node.SubConditions.length>0) {
                    orig_modulo = this._summarize(node.SubConditions[0]);
                    for (const i in node.SubConditions.slice(1)) {
                        items_modulo.push(this._summarize(node.SubConditions[i]));
                    }
                } else {
                    orig_modulo = translations["calc-missingvalue"];
                }
                for (const i in node.Variables) {
                    items_modulo.push(node.Variables[i]);
                }
                if (items_modulo.length) {
                    return translations["modulo-sentense"].replace("{0}", orig_modulo).replace("{1}", items_modulo.join(translations["subtract-joint"]));
                } else {
                    return translations["modulo-sentense"].replace("{0}", orig_modulo).replace("{1}", translations["calc-missingvalue"]);
                }
                break;
            case "PARSEINT":
                const items_parseint = [];
                for (const i in node.SubConditions) {
                    items_parseint.push(this._summarize(node.SubConditions[i]));
                }
                for (const i in node.Variables) {
                    items_parseint.push(node.Variables[i]);
                }
                if (items_parseint.length) {
                    return "<span class='parseint'>" + items_parseint.join(translations["value-joint"]) + "</span>";
                } else {
                    return translations["calc-missingvalue"];
                }
                break;
            case "EXCHANGE":
                const items_exchange = [];
                let currency;
                for (const i in node.SubConditions) {
                    items_exchange.push(this._summarize(node.SubConditions[i]));
                }
                if (node.Variables.length) {
                    currency = node.Variables[0];
                } else {
                    currency = translations["calc-missingvalue"];
                }
                if (items_exchange.length) {
                    return translations["exchange-sentense"].replace("{0}", items_exchange.join(translations["value-joint"])).replace("{1}", currency);
                } else {
                    return translations["calc-missingvalue"];
                }
                break;
            case "PARAM":
                const items_param = [];
                for (const i in node.SubConditions) {
                    items_param.push(this._summarize(node.SubConditions[i]));
                }
                for (const i in node.Variables) {
                    items_param.push("<span class='param'>" + this._getEventName(node.Variables[i]) + "</span>");
                }
                return translations["valueof-sentense"].replace("{0}", items_param.join(translations["valueof-joint"]));
                break;
        }
    }

    /**
     * Placeholder methods for dialog interactions
     * @private
     */
    _editItem(e) {
        const operator = e.target.getAttribute("operator");
        const path = e.target.getAttribute("path");
        
        try {
            const json = this.getJSON();
            const currentnode = this._getSubCondition(json, path);
            
            const finishupdating = () => {
                this.setJSON(json);
            };

            if (this.reverselookuptype[operator] == "boolean") {
                // Boolean operators edited via boolean dialog
                this.boolDialog.open(e);
            } else if (this.reverselookuptype[operator] == "optext") {
                // Text operators edited via boolean dialog
                this.boolDialog.open(e);
            } else if (this.reverselookuptype[operator] == "extract") {
                // Text extractors - open text input dialog
                let extractor = "wholesentence", extractorval = null;
                if (currentnode.SubConditions && currentnode.SubConditions.length > 0 && currentnode.SubConditions[0].Variables) {
                    extractor = currentnode.SubConditions[0].Variables[0];
                    if (currentnode.SubConditions[0].Variables.length > 1) {
                        extractorval = currentnode.SubConditions[0].Variables[1];
                    }
                }
                this.textDialog.open(currentnode.Variables[0], "env", extractor, extractorval, true, false, function(dispval, val, type, exttype, extval) {
                    if (exttype == "wholesentence") {
                        currentnode.Operator = "PARAM";
                        currentnode.Variables = [val];
                        currentnode.SubConditions = [];
                    } else {
                        currentnode.Operator = this.operatormap[exttype];
                        currentnode.Variables = [extval];
                        currentnode.SubConditions = [{"Operator": "PARAM", "SubConditions": null, "Variables": [val]}];
                    }
                    finishupdating();
                }.bind(this));
            } else if (operator == "_variable") {
                // Variable editing
                const ind = e.target.getAttribute("index");
                const current = e.target.innerText;
                if (this.operatorswithrange.includes(currentnode.Operator) && ind > 0) {
                    variableitem.classList.add("range");
                    this.rangeDialog.open(current, "variable", null, null, false, true, function(dispval, val) {
                        currentnode.Variables[ind] = val;
                        finishupdating();
                    }.bind(this));
                } else {
                    this.textDialog.open(current, "variable", null, null, false, true, function(dispval, val) {
                        currentnode.Variables[ind] = val;
                        finishupdating();
                    }.bind(this));
                }
            }
        } catch (err) {
            console.error('Error in editItem:', err);
        }
    }

    _deleteItem(e) {
        try {
            const path = e.target.getAttribute("path");
            const json = this.getJSON();
            
            const paths = path.split("/");
            let parentnode = json;
            let currentnode = json;
            
            for (const i in paths.slice(1)) {
                parentnode = currentnode;
                currentnode = currentnode.SubConditions[paths.slice(1)[i]];
            }
            
            if (parentnode.SubConditions && currentnode) {
                parentnode.SubConditions.splice(parentnode.SubConditions.indexOf(currentnode), 1);
                this.setJSON(json);
            }
        } catch (err) {
            console.error('Error in deleteItem:', err);
        }
    }

    _editBoolItem(path) {
        try {
            const json = this.getJSON();
            const currentnode = this._getSubCondition(json, path);
            
            if (document.getElementById("booltextradio").checked) {
                // Text operator handling
                const variables = [];
                const compvariables = [];
                const paramvariables = [];
                const subconditions = [];
                
                if (document.getElementById("textconditionselectvalue").value && 
                    document.getElementById("textconditionselectvalue").value != "undefined") {
                    variables.push(document.getElementById("textconditionselectvalue").value);
                }
                if (document.getElementById("textconditionselectrange").value && 
                    document.getElementById("textconditionselectrange").value != "undefined") {
                    variables.push(document.getElementById("textconditionselectrange").value);
                }
                if (document.getElementById("textcomparebaseextvalue").value && 
                    document.getElementById("textcomparebaseextvalue").value != "undefined") {
                    compvariables.push(document.getElementById("textcomparebaseextvalue").value);
                }
                if (document.getElementById("textcomparebasevalue").value && 
                    document.getElementById("textcomparebasevalue").value != "undefined") {
                    paramvariables.push(document.getElementById("textcomparebasevalue").value);
                }
                
                if (document.getElementById("textcomparebaseexttype").value == "wholesentence") {
                    subconditions.push({"Operator": "PARAM", "Variables": paramvariables});
                } else {
                    subconditions.push({
                        "Operator": this.operatormap[document.getElementById("textcomparebaseexttype").value],
                        "SubConditions": [{"Operator": "PARAM", "Variables": paramvariables}],
                        "Variables": compvariables
                    });
                }
                
                currentnode.Operator = this.operatormap[document.getElementById("textconditionselecttype").value];
                currentnode.Variables = variables;
                currentnode.SubConditions = subconditions;
                
            } else if (document.getElementById("boolnumericradio").checked) {
                // Numeric operator handling
                const numericcomparebasevalue = document.getElementById("numericcomparebase").value;
                const numericcompareoperator = document.getElementById("numericcompareoperator").value;
                const numericcomparetarget = document.getElementById("numericcomparetarget").value;
                
                currentnode["Operator"] = this.operatormap[numericcompareoperator];
                currentnode["SubConditions"] = [JSON.parse(numericcomparebasevalue), JSON.parse(numericcomparetarget)];
                
            } else if (document.getElementById("boolconditionradio").checked) {
                // Add boolean condition
                currentnode["Operator"] = document.getElementById("boolcondition").value;
                currentnode["Variables"] = [];
                currentnode["SubConditions"] = [];
            }

            document.getElementById("boolModal").style["display"] = "none";
            this.setJSON(json);
        } catch (err) {
            console.error('Error in editBoolItem:', err);
        }
    }

    /**
     * Helper to get sub-condition by path
     * @private
     */
    _getSubCondition(json, pathstring) {
        const paths = pathstring.split("/").splice(1); // Remove the first empty string from split
        let currentnode = json;
        for (const i in paths){
            if (currentnode.SubConditions) {
                if (currentnode.SubConditions[paths[i]]) {
                    currentnode = currentnode.SubConditions[paths[i]];
                } else {
                    currentnode.SubConditions[paths[i]] = {"Operator": this.baseType, "SubConditions": [], "Variables": []};
                    currentnode = currentnode.SubConditions[paths[i]];
                }
            } else {
                currentnode.SubConditions = [];
                currentnode.SubConditions.push({"Operator": this.baseType, "SubConditions": [], "Variables": []});
                currentnode = currentnode.SubConditions[0];
            }
        }
        return currentnode;
    }
    
    /**
     * Generates human-readable display text for text extraction/condition operations
     */
    _generateDisplayText(tasktype, operationtype, ...values) {
        let dispval = translations["generic-notset"];
        switch (tasktype) {
            case "extract":
                switch (operationtype) {
                    case "regex_extract":
                        dispval = translations["textextract-regex"].replace("{0}", translations[values[0]]).replace("{1}", values[1]);
                        break;
                    case "substring":
                        const range_from = values[1], range_to = values[2];
                        if (!range_from&&!range_to) {
                            dispval = translations["textextract-sub_missingvalue"];
                        } else if (range_from&&!range_to) {
                            dispval = translations["textextract-sub_from"].replace("{0}",translations[values[0]]).replace("{1}", range_from);
                        } else if (!range_from&&range_to) {
                            dispval = translations["textextract-sub_to"].replace("{0}",translations[values[0]]).replace("{1}", range_to);
                        } else if (range_from&&range_to) {
                            dispval = translations["textextract-sub_fromto"].replace("{0}",translations[values[0]]).replace("{1}", range_from).replace("{2}", range_to);
                        }
                        break;
                    case "first":
                        dispval = translations["textextract-first"].replace("{0}", translations[values[0]]).replace("{1}", values[1]);
                        break;
                    case "last":
                        dispval = translations["textextract-last"].replace("{0}", translations[values[0]]).replace("{1}", values[1]);
                        break;
                    default:
                        dispval = translations["textextract-whole"].replace("{0}",translations[values[0]]);
                        break;
                }
                break;
            case "input":
                const val = values[0] ? values[0] : translations["textcondition-missingvalue"];
                switch (operationtype){
                    case "equals":
                        dispval = translations["textcondition-equals"].replace("{0}", val);
                        break;
                    case "includes":
                        const range_includes_from = values[1], range_includes_to = values[2];
                        if (!range_includes_from && !range_includes_to) {
                            dispval = translations["textcondition-one"].replace("{0}", val);
                        } else if (range_includes_from && !range_includes_to) {
                            dispval = translations["textcondition-rangefrom"].replace("{0}", val).replace("{1}", range_includes_from);
                        } else if (!range_includes_from && range_includes_to) {
                            dispval = translations["textcondition-rangeto"].replace("{0}", val).replace("{1}", range_includes_to);
                        } else if (range_includes_from && range_includes_to) {
                            dispval = translations["textcondition-rangefromto"].replace("{0}", val).replace("{1}", range_includes_from).replace("{2}", range_includes_to);
                        }
                        break;
                    case "regex_match":
                        dispval = translations["textcondition-regex"].replace("{0}", val);
                        break;
                }
                break;
        }
        return dispval
    }

    _getEventName(eventname) {
        return translations[this._generateLocalizedKey(eventname)];
    }

    _generateLocalizedKey(eventname) {
        return "schema." + conditionEditor.platform + "." + eventname + ".label";
    }
 }

/**
 * BoolDialogHandler - Manages the boolean dialog for the ConditionEditor
 */
class BoolDialogHandler {
    constructor(editor) {
        this.editor = editor;
        this.elem = document.getElementById("boolBody");

        document.getElementById("boolmodal_text").onclick = function(e) {
            document.getElementById('booltextradio').checked=true;
            document.getElementById('boolmodal_text').classList.add('available');
            document.getElementById('boolmodal_numeric').classList.remove('available');
            document.getElementById('boolmodal_bool').classList.remove('available');
            this.validate();
        }.bind(this);

        document.getElementById("boolmodal_numeric").onclick = function(e) {
            document.getElementById('boolnumericradio').checked=true;
            document.getElementById('boolmodal_text').classList.remove('available');
            document.getElementById('boolmodal_numeric').classList.add('available');
            document.getElementById('boolmodal_bool').classList.remove('available');
            this.validate();
        }.bind(this);

        document.getElementById("textSelector").onclick = function(e) {
            this.editor.textDialog.open(document.getElementById('textcomparebasevalue').value, document.getElementById('textcomparebasetype').value,document.getElementById('textcomparebaseexttype').value, document.getElementById('textcomparebaseextvalue').value,true, false, function(disp,val,type,exttype,extval){
                document.getElementById('textcomparebasedisplay').innerHTML=disp;
                document.getElementById('textcomparebasevalue').value=val;
                document.getElementById('textcomparebasetype').value=type;
                document.getElementById('textcomparebaseexttype').value=exttype;
                document.getElementById('textcomparebaseextvalue').value=extval;
                document.getElementById('textcomparebaseplaceholder').style['display']=val?'none':'inline';
                document.getElementById('textcomparebasedisplay').style['display']=val?'inline':'none';
                this.validate();
            }.bind(this));
        }.bind(this);

        document.getElementById("textConditionSelector").onclick = function(e) {
            this.editor.textConditionDialog.open(document.getElementById('textconditionselecttype').value, document.getElementById('textconditionselectrange').value, document.getElementById('textconditionselectvalue').value, function(disp,type,range,val){
                document.getElementById('textconditionselectdisplay').innerText=disp;
                document.getElementById('textconditionplaceholder').style['display']=val?'none':'inline';
                document.getElementById('textconditionselectdisplay').style['display']=val?'inline':'none';
                document.getElementById('textconditionselectvalue').value=val;
                document.getElementById('textconditionselecttype').value=type;
                document.getElementById('textconditionselectrange').value=range;
                this.validate();
            }.bind(this));
        }.bind(this);

        document.getElementById("numericcomparebasedisp").onclick = function(e) {
            this.editor.numericDialog.open(
                document.getElementById('numericcomparebase').value,
                function(val,disp) {
                    document.getElementById('numericcomparebase').value = val;
                    document.getElementById('numericcomparebaseplacedisp').innerHTML=disp;
                    document.getElementById('numericcomparebaseplacedisp').style['display']='inline';
                    document.getElementById('numericcomparebaseplaceholder').style['display']='none';
                    document.getElementById('numericcomparebase').value=val;
                    this.validate();
            }.bind(this));
        }.bind(this);

        document.getElementById("numericcomparetargetdisp").onclick = function(e) {
            this.editor.numericDialog.open(
                document.getElementById('numericcomparetarget').value,
                function(val,disp){
                    document.getElementById('numericcomparetarget').value = val;
                    document.getElementById('numericcomparetargetplacedisp').innerHTML=disp;
                    document.getElementById('numericcomparetargetplacedisp').style['display']='inline';
                    document.getElementById('numericcomparetargetplaceholder').style['display']='none';
                    document.getElementById('numericcomparetarget').value=val;
                    this.validate();
            }.bind(this));
        }.bind(this);

        document.getElementById("boolmodal_bool").onclick= function(e) {
            document.getElementById('boolconditionradio').checked=true;
            document.getElementById('boolmodal_text').classList.remove('available');
            document.getElementById('boolmodal_numeric').classList.remove('available');
            document.getElementById('boolmodal_bool').classList.add('available');
            this.validate();
        }.bind(this);

        document.getElementById("boolcondition").onchange = function(e) {
            this.validate();
        }.bind(this);

        if (document.getElementById("boolcondition").options.length === 0) {
            const emptyoption = document.createElement("option");
            emptyoption.value = "";
            emptyoption.text = "";
            document.getElementById("boolcondition").appendChild(emptyoption);
            for (const i in editor.booleanoperators) {
                const option = document.createElement("option");
                option.value = editor.booleanoperators[i];
                option.text = editor.booleanoperators[i];
                document.getElementById("boolcondition").appendChild(option);
            }
        }
    }

    /**
     * Open boolean dialog for editing boolean/text operators
     */
    open(e) {
        try {
            const path = e.target.getAttribute("path");
            const operator = e.target.getAttribute("operator");
            const json = this.editor.getJSON();
            const currentnode = this.editor._getSubCondition(json, path);
            
            // Reset boolean dialog state
            this.elem.className = "";
            this.elem.classList.add("modal-body");
            this.elem.classList.add(this.editor.namingmap[operator]);
            this.elem.classList.add(this.editor.reverselookuptype[operator]);
            
            document.getElementById("boolmodal_text").style["display"] = "block";
            document.getElementById("boolmodal_numeric").style["display"] = "block";
            document.getElementById("boolmodal_bool").style["display"] = "block";
            document.getElementById("booltextradio").style["display"] = "inline";
            document.getElementById("boolnumericradio").style["display"] = "inline";
            document.getElementById("boolconditionradio").style["display"] = "inline";

            if (this.editor.textoperators.includes(currentnode.Operator)) {
                document.getElementById("boolmodal_text").style["display"] = "inline";
                document.getElementById("boolmodal_numeric").style["display"] = "none";
                document.getElementById("boolmodal_bool").style["display"] = "none";
                document.getElementById("booltextradio").style["display"] = "none";
                document.getElementById("booltextradio").checked = true;
                document.getElementById("boolmodal_text").classList.add("available");
                document.getElementById("textcomparebaseplaceholder").style["display"] = currentnode.SubConditions&&currentnode.SubConditions.length ? "none":"inline-block";
                document.getElementById("textcomparebasedisplay").style["display"] = currentnode.SubConditions&&currentnode.SubConditions.length ? "inline":"none";
                let extopr, taropr, targetbase, targetvar, targetvar1, targetvar2, extvar1, extvar2,  extvar3, operator;
                if (currentnode.SubConditions&&currentnode.SubConditions[0]&&currentnode.SubConditions[0].Operator == "PARAM") {
                    taropr = this.editor.namingmap[currentnode.SubConditions[0].Operator];
                    targetbase = currentnode.SubConditions[0].Variables[0];
                    targetvar1 = currentnode.SubConditions[0].Variables[1];
                    targetvar2 = currentnode.SubConditions[0].Variables[2];
                    extopr = this.editor.namingmap[currentnode.Operator];
                    extvar1 = currentnode.Variables[0];
                    extvar2 = currentnode.Variables&&currentnode.Variables.length&&currentnode.Variables[1]?currentnode.Variables[1].split("-")[0]:currentnode.Variables[1];
                    extvar3 = currentnode.Variables&&currentnode.Variables.length>1&&currentnode.Variables[1].split("-").length>1?currentnode.Variables[1].split("-")[1]:currentnode.Variables[2];
                    operator = currentnode.Operator;
                    document.getElementById("textcomparebasedisplay").innerText = this.editor._generateDisplayText("extract", taropr, targetbase, targetvar1, targetvar2);
                    document.getElementById("textcomparebaseexttype").value = taropr=="param"?"wholesentence":taropr;
                    document.getElementById("textcomparebasevalue").value = targetbase;
                    document.getElementById("textcomparebasetype").value = "env";
                    document.getElementById("textconditionselectdisplay").innerHTML = this.editor._generateDisplayText("input", extopr, extvar1, extvar2, extvar3);
                    document.getElementById("textconditionplaceholder").style["display"] = "none";
                    document.getElementById("textconditionselectdisplay").style["display"] = "inline";
                    document.getElementById("textconditionselectvalue").value = extvar1;
                    document.getElementById("textconditionselecttype").value = extopr;
                    document.getElementById("textcomparebaseextvalue").value = "";
                    document.getElementById("textconditionselectrange").value = currentnode.Variables[1];
                } else {
                    taropr = this.editor.namingmap[currentnode.SubConditions[0].Operator];
                    let paramcondition = currentnode.SubConditions[0];
                    targetbase = paramcondition.SubConditions&&paramcondition.SubConditions[0]&&paramcondition.SubConditions[0].Variables?paramcondition.SubConditions[0].Variables[0]:null;
                    targetvar = paramcondition&&paramcondition.Variables?paramcondition.Variables[0]:null;
                    targetvar1 = targetvar?targetvar.split("-")[0]:targetvar;
                    targetvar2 = targetvar&&targetvar.split("-").length>1?targetvar.split("-")[1]:paramcondition.Variables[1];
                    extopr = this.editor.namingmap[currentnode.Operator];
                    extvar1 = currentnode.Variables[0];
                    extvar2 = currentnode.Variables&&currentnode.Variables.length&&currentnode.Variables[1]?currentnode.Variables[1].split("-")[0]:currentnode.Variables[1];
                    extvar3 = currentnode.Variables&&currentnode.Variables.length>1&&currentnode.Variables[1].split("-").length>1?currentnode.Variables[1].split("-")[1]:currentnode.Variables[2];
                    operator = currentnode.Operator;
                    document.getElementById("textcomparebasedisplay").innerText = this.editor._generateDisplayText("extract", taropr, targetbase, targetvar1, targetvar2);
                    document.getElementById("textcomparebaseexttype").value = taropr=="param"?"wholesentence":taropr;
                    document.getElementById("textcomparebasevalue").value = targetbase;
                    document.getElementById("textcomparebasetype").value = "env";
                    document.getElementById("textconditionselectdisplay").innerHTML = this.editor._generateDisplayText("input", extopr, extvar1, extvar2, extvar3);
                    document.getElementById("textconditionplaceholder").style["display"] = "none";
                    document.getElementById("textconditionselectdisplay").style["display"] = "inline";
                    document.getElementById("textconditionselectvalue").value = extvar1;
                    document.getElementById("textconditionselecttype").value = extopr;
                    document.getElementById("textcomparebaseextvalue").value = targetvar;
                    document.getElementById("textconditionselectrange").value = currentnode.Variables[1];
                }
            } else {
                document.getElementById("booltextradio").checked = false;
                document.getElementById("boolmodal_text").classList.remove("available");
                document.getElementById("textcomparebaseplaceholder").style["display"] = "inline-block";
                document.getElementById("textcomparebasedisplay").style["display"] = "none";
                document.getElementById("textcomparebasedisplay").innerText = "";
                document.getElementById("textcomparebasevalue").value = "";
                document.getElementById("textcomparebasetype").value = "";
                document.getElementById("textcomparebaseexttype").value = "";
                document.getElementById("textcomparebaseextvalue").value = "";
                document.getElementById("textconditionplaceholder").style["display"] = "inline";
                document.getElementById("textconditionselectdisplay").style["display"] = "none";
                document.getElementById("textconditionselectdisplay").innerText = translations["compare-novalue"];
                document.getElementById("textconditionselectvalue").value = "";
                document.getElementById("textconditionselecttype").value = "";
                document.getElementById("textconditionselectrange").value = "";
            }
            
            document.getElementById("boolnumericradio").checked = false;
            document.getElementById("boolmodal_numeric").classList.remove("available");
            document.getElementById("numericcomparebaseplaceholder").style["display"] = "inline-block";
            document.getElementById("numericcomparebaseplacedisp").style["display"] = "none";
            document.getElementById("numericcomparebase").value = "";
            document.getElementById("numericcompareoperator").value = ">";
            document.getElementById("numericcomparetargetplaceholder").style["display"] = "inline-block";
            document.getElementById("numericcomparetargetplacedisp").style["display"] = "none";
            document.getElementById("numericcomparetarget").value = "";
            document.getElementById("boolconditionradio").checked = false;
            document.getElementById("boolmodal_bool").classList.remove("available");
            document.getElementById("boolSubmitButton").disabled = "disabled";
            document.getElementById("boolcondition").value = "";

            document.getElementById("boolModal").style["display"] = "block";
            document.getElementById("boolPath").value = path;
            
            // Store reference to editor for callback
            const self = this;
            document.getElementById("boolSubmitButton").onclick = function() {
                self.editor._editBoolItem(path);
            };
        } catch (err) {
            console.error('Error in BoolDialogHandler.open():', err);
        }
    }

    /**
     * Validate boolean dialog form inputs
     */
    validate() {
        const classList = document.getElementById("boolBody").classList;
        document.getElementById("boolSubmitButton").disabled = "disabled";
        if (document.getElementById("booltextradio").checked) {
            document.getElementById("boolSubmitButton").disabled =
                document.getElementById("textcomparebasevalue").value &&
                document.getElementById("textcomparebasetype").value && 
                document.getElementById("textconditionselectvalue").value && 
                document.getElementById("textconditionselecttype").value ? "" : "disabled";
        } else if (document.getElementById("boolnumericradio").checked) {
            document.getElementById("boolSubmitButton").disabled =
                document.getElementById("numericcomparebase").value &&
                document.getElementById("numericcompareoperator").value && 
                document.getElementById("numericcomparetarget").value ? "" : "disabled";
        } else if (document.getElementById("boolconditionradio").checked) {
            document.getElementById("boolSubmitButton").disabled =
                document.getElementById("boolcondition").value ? "" : "disabled";
        }
    }
}

class TextDialogHandler {
    constructor(editor) {
        this.editor = editor;
        document.getElementById("textEnvArea").onclick = function(e) {
            document.getElementById('textenvradio').checked=true;
            document.getElementById('textEnvArea').classList.add('available');
            document.getElementById('textEnterArea').classList.remove('available');
            document.getElementById('textExtArea').classList.add('available');
            document.getElementById('textExtSelect').disabled='';
            this.validate();
        }.bind(this);

        document.getElementById("textEnvSelect").onchange = this.validate;

        document.getElementById("textEnterArea").onclick = function (){
            document.getElementById('textenterradio').checked=true;
            document.getElementById('textEnterArea').classList.add('available');
            document.getElementById('textEnvArea').classList.remove('available');
            document.getElementById('textExtArea').classList.remove('available');
            document.getElementById('textExtSelect').disabled='';
            this.validate();
        }.bind(this);

        document.getElementById("textEnter").onchange = this.validate;

        document.getElementById("textExtArea").onchange = function(e) {
            document.getElementById('textenvradio').checked=true;
            document.getElementById('textEnvArea').classList.add('available');
            document.getElementById('textExtArea').classList.add('available');
            this.validate();
        }.bind(this);

        document.getElementById("textExtSelect").onchange = function(e) {
            this.validate();
            document.getElementById('textExtRegex').style['display']=e.target.value=='regex_extract'?'inline-block':'none';
            document.getElementById('textExtSubFrom').style['display']=e.target.value=='substring'?'inline-block':'none';
            document.getElementById('textExtSubTo').style['display']=e.target.value=='substring'?'inline-block':'none';
            document.getElementById('textExtFirst').style['display']=e.target.value=='first'?'inline-block':'none';
            document.getElementById('textExtLast').style['display']=e.target.value=='last'?'inline-block':'none';
        }.bind(this);
        
        if (document.getElementById("textExtSelect").options.length === 0) {
            const emptyoption = document.createElement("option");
            emptyoption.value = "";
            emptyoption.text = "";
            document.getElementById("textExtSelect").appendChild(emptyoption);
            for (const i in editor.textextractors) {
                const option = document.createElement("option");
                option.value = editor.namingmap[editor.textextractors[i]] ||editor.textextractors[i];
                option.text = translations[editor.textextractors[i]] || editor.textextractors[i];
                document.getElementById("textExtSelect").appendChild(option);
            }
        }

        document.getElementById("textExtRegex").onchange = this.validate;
        document.getElementById("textExtSubFrom").onchange = this.validate;
        document.getElementById("textExtSubTo").onchange = this.validate;
        document.getElementById("textExtFirst").onchange = this.validate;
        document.getElementById("textExtLast").onchange = this.validate;
    }

    /**
     * Open text dialog for editing text conditions
     */
    open(currentvalue, currenttype, currentextractor, currentextractorval, includeenv, includeenter, callback, validator){
        document.getElementById("textBody").className = "";
        document.getElementById("textBody").classList.add("modal-body");
        document.getElementById("textBody").classList.add("textselection");
        document.getElementById("textenvradio").checked = currenttype == "env";
        document.getElementById("textEnvSelect").value = currenttype == "env" ? currentvalue : "event_message";
        document.getElementById("textenterradio").checked = currenttype == "variable";
        document.getElementById("textEnter").value = currenttype == "variable" ? currentvalue : "";
        document.getElementById("textValidator").value = validator ?? "";

        document.getElementById('textEnterArea').classList.remove('available');
        document.getElementById('textEnvArea').classList.remove('available');
        document.getElementById('textExtArea').classList.remove('available');
        document.getElementById('textExtSelect').disabled = currenttype == "variable" || !includeenv ? "disabled" : "";
        document.getElementById('textExtSelect').value=currentextractor??"wholesentence";
        document.getElementById('textExtRegex').style['display']= currentextractor=="regex_extract" ? "inline-block":"none";
        document.getElementById('textExtRegex').value=currentextractor=="regex_extract"?currentextractorval:"";
        document.getElementById('textExtSubFrom').style['display']= currentextractor=="substring" ? "inline-block":"none";
        document.getElementById('textExtSubFrom').value=currentextractor=="substring"?currentextractorval?.split("-")[0]:"";
        document.getElementById('textExtSubTo').style['display']= currentextractor=="substring" ? "inline-block":"none";
        document.getElementById('textExtSubTo').value=currentextractor=="substring"&&currentextractorval?.length>1?currentextractorval.split("-")[1]:"";
        document.getElementById('textExtFirst').style['display']= currentextractor=="first" ? "inline-block":"none";
        document.getElementById('textExtFirst').value=currentextractor=="first"?currentextractorval:"";
        document.getElementById('textExtLast').style['display']= currentextractor=="last" ? "inline-block":"none";
        document.getElementById('textExtLast').value=currentextractor=="last"?currentextractorval:"";
        document.getElementById("textenterradio").style["display"]= includeenter ? "inline-block" : "none";
        
        if (currenttype == "env" || !includeenter) {
            document.getElementById('textEnvArea').classList.add('available');
            document.getElementById('textExtArea').classList.add('available');
        } else if (currenttype == "variable" || !includeenv) {
            document.getElementById('textEnterArea').classList.add('available');
        }
        if (includeenter) {
            document.getElementById("textBody").classList.add("includeenter");
            document.getElementById("textenvradio").style["display"]= "inline-block";
        } else {
            document.getElementById("textenvradio").checked = true;
            document.getElementById("textenvradio").style["display"]= "none";
        }
        if (includeenv) {
            document.getElementById("textBody").classList.add("includeenv");
            document.getElementById("textenterradio").style["display"]= "inline-block";
        } else {
            document.getElementById("textenterradio").checked = true;
            document.getElementById("textenterradio").style["display"]= "none";
        }
        this.validate();
        document.getElementById("textModal").style["display"] = "block";
        document.getElementById("textSubmitButton").onclick = function() {
            let dispval,val,type,exttype,extval,env;
            if (document.getElementById("textenterradio").checked) {
                dispval = document.getElementById("textEnter").value;
                val = document.getElementById("textEnter").value;
                type = "variable";
            } else if (document.getElementById("textenvradio").checked) {
                val = document.getElementById("textEnvSelect").value;
                env = this.editor._generateLocalizedKey(val);
                type = "env";
                exttype = document.getElementById("textExtSelect").value;
                switch (exttype) {
                    case "regex_extract":
                        extval = document.getElementById("textExtRegex").value;
                        dispval = this.editor._generateDisplayText("extract", "regex_extract", env, extval);
                        break;
                    case "substring":
                        extval = `${document.getElementById('textExtSubFrom').value}-${document.getElementById('textExtSubTo').value}`;
                        dispval = this.editor._generateDisplayText("extract", "substring", env, extval);
                        break;
                    case "first":
                        extval = document.getElementById("textExtFirst").value;
                        dispval = this.editor._generateDisplayText("extract", "first", env, extval);
                        break;
                    case "last":
                        extval = document.getElementById("textExtLast").value;
                        dispval = this.editor._generateDisplayText("extract", "last", env, extval);
                        break;
                    default:
                        extval = "";
                        exttype = "wholesentence";
                        dispval = this.editor._generateDisplayText("extract", "wholesentence", env);
                        break;
                }
            }
            callback(dispval, val, type, exttype, extval);
            document.getElementById("textModal").style["display"] = "none";
        }.bind(this);
    }

    validate() {
        let valid = false;
        if (document.getElementById("textenvradio").checked) {
            valid = document.getElementById("textEnvSelect").value;
            if (document.getElementById("textExtSelect").value=="regex_extract") {
            try {
                RegExp(document.getElementById("textExtRegex").value);
            } catch {
                valid = false;
            }
            } else if (document.getElementById("textExtSelect").value=="substring") {
                try {
                    valid = isNaN(parseInt(document.getElementById("textExtSubTo").value)) ^ isNaN(parseInt(document.getElementById("textExtSubFrom").value)) || parseInt(document.getElementById("textExtSubTo").value) >= parseInt(document.getElementById("textExtSubFrom").value);
                } catch {
                    valid = false;
                }
            } else if (document.getElementById("textExtSelect").value=="first") {
                valid = parseInt(document.getElementById("textExtFirst").value);
            } else if (document.getElementById("textExtSelect").value=="last") {
                valid = parseInt(document.getElementById("textExtLast").value);
            }
        } else if (document.getElementById("textenterradio").checked) {
            valid = document.getElementById("textEnter").value;
            if (document.getElementById("textValidator").value) {
                valid &&= document.getElementById("textEnter").value.match(document.getElementById("textValidator").value);
            }
        }
        
        document.getElementById("textSubmitButton").disabled = valid ? "" : "disabled";
    }
}

class RangeDialogHandler {
    constructor(editor) {
        this.editor = editor;
    }

    open(current, type, val, exttype, extval, callback) {
        // Implementation for opening the range dialog
    }

    validate() {
        // Implementation for validating the range dialog
    }
}

/**
 * TextConditionDialogHandler - Manages the text condition dialog for the ConditionEditor
 */
class TextConditionDialogHandler {
    constructor(editor) {
        this.editor = editor;

        document.getElementById("ext_eq").onclick = function(e) {
            document.getElementById('textConditionEqualradio').checked=true;
            document.getElementById('ext_eq').classList.add('available');
            document.getElementById('ext_range').classList.remove('available');
            document.getElementById('ext_reg').classList.remove('available');
            this.validate();
        }.bind(this);

        document.getElementById("textConditionEqualradio").onselect = this.validate;
        document.getElementById("textconditionequals").onchange = this.validate;

        document.getElementById("ext_range").onclick = function(e) {
            document.getElementById('textconditionrangeradio').checked=true;
            document.getElementById('ext_eq').classList.remove('available');
            document.getElementById('ext_range').classList.add('available');
            document.getElementById('ext_reg').classList.remove('available');
            this.validate();
        }.bind(this);

        document.getElementById("textconditionrangeradio").onselect = this.validate;
        document.getElementById("textconditionrangetext").onchange = this.validate;
        document.getElementById("textconditionrange-from").onchange = this.validate;
        document.getElementById("textconditionrange-to").onchange = this.validate;

        document.getElementById("ext_reg").onclick = function(e) {
            document.getElementById('textconditionregexradio').checked=true;
            document.getElementById('ext_eq').classList.remove('available');
            document.getElementById('ext_range').classList.remove('available');
            document.getElementById('ext_reg').classList.add('available');
            this.validate();
        }.bind(this);

        document.getElementById("textconditionregexradio").onselect = this.validate;
        document.getElementById("textconditionregex").onchange = this.validate;
    }

    /**
     * Open text condition dialog for editing text condition operators
     */
    open(currenttype, currentrange, currentval, callback) {
        document.getElementById("textConditionEqualradio").checked = currenttype == "equals";
        document.getElementById("textconditionrangeradio").checked = currenttype == "includes";
        document.getElementById("textconditionregexradio").checked = currenttype == "regex_match";
        document.getElementById("textconditionrange-from").value = currenttype == "includes" ? currentrange.split("-")[0] : "";
        document.getElementById("textconditionrange-to").value = currenttype == "includes" && currentrange.indexOf("-") && currentrange !== "-" ? currentrange.split("-")[1] : "";
        document.getElementById("textconditionequals").value = currenttype == "equals" ? currentval : "";
        document.getElementById("textconditionrangetext").value = currenttype == "includes" ? currentval : "";
        document.getElementById("textconditionregex").value = currenttype == "regex_match" ? currentval : "";
        this.validate();
        document.getElementById("textConditionModalButton").onclick = () => {
            let dispval, type, range, val;
            if (document.getElementById("textConditionEqualradio").checked) {
                type = "equals";
                val = document.getElementById("textconditionequals").value;
                dispval = this.editor._generateDisplayText("input", "equals", val);
            } else if (document.getElementById("textconditionrangeradio").checked) {
                type = "includes";
                val = document.getElementById("textconditionrangetext").value;
                range = `${document.getElementById("textconditionrange-from").value}-${document.getElementById("textconditionrange-to").value}`;
                dispval = this.editor._generateDisplayText("input", "includes", val, document.getElementById("textconditionrange-from").value, document.getElementById("textconditionrange-to").value);
            } else if (document.getElementById("textconditionregexradio").checked) {
                type = "regex_match";
                val = document.getElementById("textconditionregex").value;
                dispval = this.editor._generateDisplayText("input", "regex_match", val);
            }
            callback(dispval, type, range, val);
            document.getElementById("textConditionModal").style["display"] = "none";
        }
        document.getElementById("textConditionModal").style["display"] = "block";
    }

    /**
     * Validate text condition dialog form inputs
     */
    validate() {
        if (document.getElementById("textConditionEqualradio").checked) {
            document.getElementById("textConditionModalButton").disabled = document.getElementById("textconditionequals").value?"":"disabled";
            return;
        } else if (document.getElementById("textconditionrangeradio").checked) {
            document.getElementById("textConditionModalButton").disabled = document.getElementById("textconditionrangetext").value && (!document.getElementById("textconditionrange-from").value 
            || !document.getElementById("textconditionrange-to").value || 
            parseInt(document.getElementById("textconditionrange-to").value) > 
            parseInt(document.getElementById("textconditionrange-from").value)) ? "" : "disabled";
            return;
        } else if (document.getElementById("textconditionregexradio").checked) {
            try {
                RegExp(document.getElementById("textconditionregex").value);
                document.getElementById("textConditionModalButton").disabled = "";
            } catch {
                document.getElementById("textConditionModalButton").disabled = "disabled";
            }
            return;
        }
        document.getElementById("textConditionModalButton").disabled = "disabled";
    }
}

/**
 * NumericDialogHandler - Manages the numeric input dialog for the ConditionEditor
 */
class NumericDialogHandler {
    constructor(editor) {
        this.editor = editor;
        if (!document.getElementById("calctoolarea").children.length) {
            for (const i in this.editor.calcoperators) {
                const operatorbutton = document.createElement("div"), operatortype = this.editor.calcoperators[i];
                operatorbutton.innerHTML = this.editor.calcoperatorssign[operatortype];
                operatorbutton.classList.add("calcoperator");
                operatorbutton.setAttribute("operatortype", operatortype);
                operatorbutton.onclick = function(e){
                    this.appendOperator(e.target.getAttribute("operatortype"));
                }.bind(this);
                document.getElementById("calctoolarea").appendChild(operatorbutton);
            }
            const horizontalline = document.createElement("hr");
            document.getElementById("calctoolarea").appendChild(horizontalline);
            const calcvalinputbutton = document.createElement("div");
            calcvalinputbutton.classList.add("calcvalinputbutton");
            calcvalinputbutton.innerText = translations["calcvalinput"];
            calcvalinputbutton.onclick = this.appendValue.bind(this);
            document.getElementById("calctoolarea").appendChild(calcvalinputbutton);
        }
        const self = this;
        window.onkeyup = function(e) {
            if (self.keyupEvent) {
                self.keyupEvent(e);
            }
        }
    }

    /**
     * Open numeric input dialog for editing numeric formulas
     */
    open(currentformula, callback) {
        document.getElementById("calcformula").value = currentformula;
        document.getElementById("calccursorpos").value = "/";
        try {
            const formula = JSON.parse(currentformula);
            this.visualizeFormula(formula);
        } catch {
            this.visualizeFormula({});
        }
        document.getElementById("numModal").style["display"] = "block";
        this.validate();
        document.getElementById("numModalButton").onclick = function(){
            callback(document.getElementById("calcformula").value, document.getElementById("calcdisplay").innerText);
            document.getElementById("numModal").style["display"] = "none";
        }
        this.keyupEvent = function(e) {
            if (e.key === "Escape") {
                document.getElementById("numModal").style["display"] = "none";
            } else if (e.key === "Enter") {
                if (!document.getElementById("numModalButton").disabled) {
                    callback(document.getElementById("calcformula").value, document.getElementById("calcdisplay").innerText);
                    document.getElementById("numModal").style["display"] = "none";
                }
            } else if (!isNaN(e.key)) {
                this.typeNumericValue(parseInt(e.key));
            }
        }
    }

    /**
     * Validate numeric dialog form inputs
     */
    validate() {
        const current = document.getElementById("calcformula").value;
        try {
            const formula = JSON.parse(current);
            const singlevalue = (formula.Operator == "PARSEINT" && !formula.SubConditions) || (formula.SubConditions && formula.SubConditions.length == 1 && formula.SubConditions[0].Operator === "PARSEINT");
            document.getElementById("numModalButton").disabled = singlevalue || this.checkNumValid(formula, true) ? "" : "disabled";
        } catch (e) {
            document.getElementById("numModalButton").disabled = "disabled";
        }
    }
    
    /**
     * Appends a calculation operator to the formula
     */
    appendOperator(operatortype) {
        this.appendItemToFormula({"Operator": operatortype, SubConditions: null, Variables: null});
    }

    typeNumericValue(value) {
        const current = document.getElementById("calcformula").value;
        let formula;
        try {
            formula = JSON.parse(current);
        } catch {
            formula = {};
        }
        const cursorpath = document.getElementById("calccursorpos").value;
        const pathParts = cursorpath.split("/").filter(part => part);
        let targetNode = formula;
        for (const part of pathParts) {
            const [type, index] = part.split(":");
            if (type === "sub" && targetNode.SubConditions && targetNode.SubConditions[index]) {
                targetNode = targetNode.SubConditions[index];
            } else {
                console.error(`Invalid path: ${cursorpath}`);
                return;
            }
        }
        if (targetNode.Operator === "PARSEINT" && !targetNode.SubConditions) {
            if (targetNode.Variables && targetNode.Variables.length > 0 && !isNaN(targetNode.Variables[0])) {
                targetNode.Variables[0] = targetNode.Variables[0] + value.toString();
            } else {
                targetNode.Variables = [value];
            }
        } else if (targetNode.SubConditions && targetNode.SubConditions.length === 1 && targetNode.SubConditions[0].Operator === "PARSEINT") {
            targetNode.SubConditions[0].Variables = [value];
        } else {
            targetNode.Operator = "PARSEINT";
            targetNode.Variables = [value];
        }
        document.getElementById("calcformula").value = JSON.stringify(formula);
        this.visualizeFormula(formula); 
    }

    /**
     * Appends a value to the calculation formula
     */
    appendValue() {
        const keyEventEvac = this.keyupEvent;
        this.keyupEvent = null;
        this.editor.textDialog.open(null, null, null, null, true, true, function(dispval, val, type, exttype, extval){
            let appendnode;
            if (type == "env") {
                if (exttype && exttype != "wholesentence" && extval) {
                    appendnode = {"Operator": "PARSEINT", "SubConditions": [{"Operator": this.editor.operatormap[exttype], "SubConditions": [{"Operator": "PARAM", "SubConditions": null, "Variables": [val]}], "Variables": [extval]}], "Variables": null };
                } else {
                    appendnode = {"Operator": "PARSEINT", "SubConditions": [{"Operator": "PARAM", "SubConditions": null, "Variables": [val]}], "Variables": null };
                }
            } else if (type == "variable") {
                appendnode = {"Operator": "PARSEINT", "SubConditions": null, "Variables": [val]};
            }
            if (appendnode) {
                this.appendItemToFormula(appendnode);
            }
            this.keyupEvent = keyEventEvac;
        }.bind(this), "^[0-9]+(\\.[0-9]+)?$");
    }

    /**
     * Visualizes the calculation formula
     */
    visualizeFormula(val){
        const current = document.getElementById("calcformula").value;
        let formula;
        try {
            formula = JSON.parse(current);
        } catch {
            formula = {};
        }
        document.getElementById("visualizedcalc").after(document.getElementById("calccursor"));
        document.getElementById("visualizedcalc").replaceChildren();
        this.appendElem(formula, document.getElementById("visualizedcalc"), "");
        document.getElementById("calcdisplay").innerText = document.getElementById("visualizedcalc").innerText;
        const insertTopPlaceHolder = document.createElement("span");
        insertTopPlaceHolder.innerHTML = "&nbsp;";
        insertTopPlaceHolder.style["display"] = "inline-block";
        insertTopPlaceHolder.style["width"] = "0.3rem";
        insertTopPlaceHolder.style["height"] = "1.5rem";
        insertTopPlaceHolder.onclick = function(e){
            document.getElementById("calccursorpos").value = "/sub:0:pre";
            this.setCursor(JSON.parse(document.getElementById("calcformula").value));
        }.bind(this);
        document.getElementById("visualizedcalc").prepend(insertTopPlaceHolder);
        this.setCursor(formula);
    }

    /**
     * Updates cursor position in the formula editor
     */
    updateCursor(e){
        document.getElementById("calccursorpos").value = e.target.getAttribute("path");
        this.setCursor(JSON.parse(document.getElementById("calcformula").value));
        event.stopPropagation();
    }

    /**
     * Sets the cursor position in the formula
     */
    setCursor(node) {
        const cursorpath = document.getElementById("calccursorpos").value;
        let targetelement = document.getElementById("visualizedcalc");
        let prepending = false;
        for (const i in cursorpath.split("/")) {
            const address = cursorpath.split("/")[i];
            if (!address) {
                continue;
            }
            const type = address.split(":")[0];
            const index = address.split(":")[1];
            prepending = address.split(":").length > 2 && address.split(":")[2] == "pre";
            const directChildren = Array.from(targetelement.children).filter(child => child.classList.contains(type));
            targetelement = directChildren[index];
        }
        if (targetelement) {
            if (prepending) {
                targetelement.prepend(document.getElementById("calccursor"));
            } else {
                targetelement.append(document.getElementById("calccursor"));
            }
        } else {
            document.getElementById("visualizedcalc").append(document.getElementById("calccursor"));
        }
    }

    /**
     * Appends a calculation element to the UI
     */
    appendElem(node, base, path) {
        if (node) {
            switch(node.Operator) {
                case "ADD":
                    for (const i in node.SubConditions) {
                        if (base.childNodes.length) {
                            const plussign = document.createElement("span");
                            plussign.innerText = "＋";
                            plussign.setAttribute("path",  path + "/sub:" + i + ":pre");
                            plussign.onclick = this.updateCursor.bind(this);
                            plussign.classList.add("plussign");
                            base.append(plussign);
                        }
                        const child = document.createElement("span");
                        child.classList.add("sub");
                        if (node.SubConditions[i].SubConditions && node.SubConditions[i].SubConditions.length > 1) {
                            child.classList.add("plusbracket");
                        }
                        child.setAttribute("path",  path + "/sub:" + i);
                        child.onclick = this.updateCursor.bind(this);
                        this.appendElem(node.SubConditions[i], child, path + "/sub:" + i);
                        base.append(child);
                    }
                    for (const i in node.Variables) {
                        if (base.childNodes.length) {
                            const plussign = document.createElement("span");
                            plussign.classList.add("plussign");
                            plussign.setAttribute("path",  path + "/const:" + i + ":pre");
                            plussign.onclick = this.updateCursor.bind(this);
                            plussign.innerText = "＋";
                            base.append(plussign);
                        }
                        const prependelem = document.createElement("span");
                        prependelem.setAttribute("path",  path + "/const:" + i);
                        prependelem.onclick = this.updateCursor.bind(this);
                        prependelem.classList.add("prepend");
                        base.append(prependelem);
                        const variableelem = document.createElement("span");
                        variableelem.classList.add("const");
                        variableelem.classList.add("add");
                        variableelem.setAttribute("path",  path + "/const:" + i);
                        variableelem.onclick = this.updateCursor.bind(this);
                        variableelem.innerText = node.Variables[i];
                        base.append(variableelem);
                        const appendelem = document.createElement("span");
                        appendelem.classList.add("append");
                        appendelem.setAttribute("path",  path + "/const:" + i);
                        appendelem.onclick = this.updateCursor.bind(this);
                        base.append(appendelem);
                    }
                    if ((!node.SubConditions || node.SubConditions.length < 2) && (!node.Variables || node.Variables.length < 2)) {
                        if ((!node.SubConditions || node.SubConditions.length < 1) && (!node.Variables || node.Variables.length < 1)){
                            const placeholder = document.createElement("span");
                            placeholder.classList.add("placeholder");
                            placeholder.innerText = translations["calc-missingvalue"];
                            placeholder.setAttribute("path",  path + "/placeholder:0");
                            placeholder.onclick = this.fillPlaceHolder.bind(this);
                            base.append(placeholder);
                        }
                        if (path != "") {
                            const plussign = document.createElement("span");
                            plussign.innerText = "＋";
                            base.append(plussign);
                            const placeholder = document.createElement("span");
                            placeholder.classList.add("placeholder");
                            placeholder.innerText = translations["calc-missingvalue"];
                            placeholder.setAttribute("path",  path + "/placeholder:0");
                            placeholder.onclick = this.fillPlaceHolder.bind(this);
                            base.append(placeholder);
                        }
                    }
                    break;
                case "MULTIPLY":
                    for (const i in node.SubConditions) {
                        if (base.childNodes.length) {
                            const multiplysign = document.createElement("span");
                            multiplysign.innerText = "×";
                            multiplysign.setAttribute("path",  path + "/sub:" + i + ":pre");
                            multiplysign.onclick = this.updateCursor.bind(this);
                            multiplysign.classList.add("multiplysign");
                            base.append(multiplysign);
                        }
                        const child = document.createElement("span");
                        if (node.SubConditions[i].SubConditions && node.SubConditions[i].SubConditions.length > 1) {
                            child.classList.add("multiplybracket");
                        }
                        child.classList.add("sub");
                        this.appendElem(node.SubConditions[i], child, path + "/sub:" + i);
                        if (child.childNodes.length && node.SubConditions[i].Operator != "PARAM" && node.SubConditions[i].Operator != "PARSEINT") {
                            const bracketbegin = document.createElement("span");
                            bracketbegin.innerText = "(";
                            bracketbegin.setAttribute("path",  path + "/sub:" + i + ":pre");
                            bracketbegin.onclick = this.updateCursor.bind(this);
                            child.prepend(bracketbegin);
                            const bracketend = document.createElement("span");
                            bracketend.innerText = ")";
                            bracketend.setAttribute("path",  path + "/sub:" + i);
                            bracketend.onclick = this.updateCursor.bind(this);
                            child.append(bracketend);
                        }
                        child.setAttribute("path",  path + "/sub:" + i);
                        child.onclick = this.updateCursor.bind(this);
                        base.append(child);
                    }
                    for (const i in node.Variables) {
                        if (base.childNodes.length) {
                            const multiplysign = document.createElement("span");
                            multiplysign.classList.add("multiplysign");
                            multiplysign.setAttribute("path",  path + "/const:" + i + ":pre");
                            multiplysign.onclick = this.updateCursor.bind(this);
                            multiplysign.innerText = "×";
                            base.append(multiplysign);
                        }
                        const prependelem = document.createElement("span");
                        prependelem.setAttribute("path",  path + "/const:" + i);
                        prependelem.onclick = this.updateCursor.bind(this);
                        prependelem.classList.add("prepend");
                        base.append(prependelem);
                        const variableelem = document.createElement("span");
                        variableelem.classList.add("const");
                        variableelem.classList.add("multiply");
                        variableelem.setAttribute("path",  path + "/const:" + i);
                        variableelem.onclick = this.updateCursor.bind(this);
                        variableelem.innerText = node.Variables[i];
                        base.append(variableelem);
                        const appendelem = document.createElement("span");
                        appendelem.classList.add("append");
                        appendelem.setAttribute("path",  path + "/const:" + i);
                        appendelem.onclick = this.updateCursor.bind(this);
                        base.append(appendelem);
                    }
                    if ((!node.SubConditions || node.SubConditions.length < 2) && (!node.Variables || node.Variables.length < 2)) {
                        if ((!node.SubConditions || node.SubConditions.length < 1) && (!node.Variables || node.Variables.length < 1)){
                            const placeholder = document.createElement("span");
                            placeholder.classList.add("placeholder");
                            placeholder.innerText = translations["calc-missingvalue"];
                            placeholder.setAttribute("path",  path + "/placeholder:0");
                            placeholder.onclick = this.fillPlaceHolder.bind(this);
                            base.append(placeholder);
                        }
                        const multiplysign = document.createElement("span");
                        multiplysign.innerText = "×";
                        base.append(multiplysign);
                        const placeholder = document.createElement("span");
                        placeholder.classList.add("placeholder");
                        placeholder.innerText = translations["calc-missingvalue"];
                        placeholder.setAttribute("path",  path + "/placeholder:0");
                        placeholder.onclick = this.fillPlaceHolder.bind(this);
                        base.append(placeholder);
                    }
                    break;
                case "SUBTRACT":
                    for (const i in node.SubConditions) {
                        if (base.childNodes.length) {
                            const minussign = document.createElement("span");
                            minussign.innerText = "－";
                            minussign.setAttribute("path",  path + "/sub:" + i + ":pre");
                            minussign.onclick = this.updateCursor.bind(this);
                            minussign.classList.add("minussign");
                            base.append(minussign);
                        }
                        const child = document.createElement("span");
                        child.classList.add("sub");
                        if (node.SubConditions[i].SubConditions && node.SubConditions[i].SubConditions.length > 1) {
                            child.classList.add("minusbracket");
                        }
                        child.setAttribute("path",  path + "/sub:" + i);
                        child.onclick = this.updateCursor.bind(this);
                        this.appendElem(node.SubConditions[i], child, path + "/sub:" + i);
                        base.append(child);
                    }
                    for (const i in node.Variables) {
                        if (base.childNodes.length) {
                            const minussign = document.createElement("span");
                            minussign.classList.add("minussign");
                            minussign.setAttribute("path",  path + "/const:" + i + ":pre");
                            minussign.onclick = this.updateCursor.bind(this);
                            minussign.innerText = "－";
                            base.append(minussign);
                        }
                        const prependelem = document.createElement("span");
                        prependelem.setAttribute("path",  path + "/const:" + i);
                        prependelem.onclick = this.updateCursor.bind(this);
                        prependelem.classList.add("prepend");
                        base.append(prependelem);
                        const variableelem = document.createElement("span");
                        variableelem.classList.add("const");
                        variableelem.classList.add("subtract");
                        variableelem.setAttribute("path",  path + "/const:" + i);
                        variableelem.onclick = this.updateCursor.bind(this);
                        variableelem.innerText = node.Variables[i];
                        base.append(variableelem);
                        const appendelem = document.createElement("span");
                        appendelem.classList.add("append");
                        appendelem.setAttribute("path",  path + "/const:" + i);
                        appendelem.onclick = this.updateCursor.bind(this);
                        base.append(appendelem);
                    }
                    if ((!node.SubConditions || node.SubConditions.length < 2) && (!node.Variables || node.Variables.length < 2)) {
                        if ((!node.SubConditions || node.SubConditions.length < 1) && (!node.Variables || node.Variables.length < 1)){
                            const placeholder = document.createElement("span");
                            placeholder.classList.add("placeholder");
                            placeholder.innerText = translations["calc-missingvalue"];
                            placeholder.setAttribute("path",  path + "/placeholder:0");
                            placeholder.onclick = this.fillPlaceHolder.bind(this);
                            base.append(placeholder);
                        }
                        const minussign = document.createElement("span");
                        minussign.innerText = "－";
                        base.append(minussign);
                        const placeholder = document.createElement("span");
                        placeholder.classList.add("placeholder");
                        placeholder.innerText = translations["calc-missingvalue"];
                        placeholder.setAttribute("path",  path + "/placeholder:0");
                        placeholder.onclick = this.fillPlaceHolder.bind(this);
                        base.append(placeholder);
                    }
                    break;
                case "DIVIDE":
                    for (const i in node.SubConditions) {
                        if (base.childNodes.length) {
                            const divisionsign = document.createElement("span");
                            divisionsign.innerText = "÷";
                            divisionsign.setAttribute("path",  path + "/sub:" + i + ":pre");
                            divisionsign.onclick = this.updateCursor.bind(this);
                            divisionsign.classList.add("divisionsign");
                            base.append(divisionsign);
                        }
                        const child = document.createElement("span");
                        if (node.SubConditions[i].SubConditions && node.SubConditions[i].SubConditions.length > 1) {
                            child.classList.add("divisionbracket");
                        }
                        child.classList.add("sub");
                        this.appendElem(node.SubConditions[i], child, path + "/sub:" + i);
                        if (child.childNodes.length && node.SubConditions[i].Operator != "PARAM" && node.SubConditions[i].Operator != "PARSEINT") {
                            const bracketbegin = document.createElement("span");
                            bracketbegin.innerText = "(";
                            bracketbegin.setAttribute("path",  path + "/sub:" + i + ":pre");
                            bracketbegin.onclick = this.updateCursor.bind(this);
                            child.prepend(bracketbegin);
                            const bracketend = document.createElement("span");
                            bracketend.innerText = ")";
                            bracketend.setAttribute("path",  path + "/sub:" + i);
                            bracketend.onclick = this.updateCursor.bind(this);
                            child.append(bracketend);
                        }
                        child.setAttribute("path",  path + "/sub:" + i);
                        child.onclick = this.updateCursor.bind(this);
                        base.append(child);
                    }
                    for (const i in node.Variables) {
                        if (base.childNodes.length) {
                            const divisionsign = document.createElement("span");
                            divisionsign.classList.add("divisionsign");
                            divisionsign.setAttribute("path",  path + "/const:" + i + ":pre");
                            divisionsign.onclick = this.updateCursor.bind(this);
                            divisionsign.innerText = "÷";
                            base.append(divisionsign);
                        }
                        const prependelem = document.createElement("span");
                        prependelem.setAttribute("path",  path + "/const:" + i);
                        prependelem.onclick = this.updateCursor.bind(this);
                        prependelem.classList.add("prepend");
                        base.append(prependelem);
                        const variableelem = document.createElement("span");
                        variableelem.classList.add("const");
                        variableelem.classList.add("division");
                        variableelem.setAttribute("path",  path + "/const:" + i);
                        variableelem.onclick = this.updateCursor.bind(this);
                        variableelem.innerText = node.Variables[i];
                        base.append(variableelem);
                        const appendelem = document.createElement("span");
                        appendelem.classList.add("append");
                        appendelem.setAttribute("path",  path + "/const:" + i);
                        appendelem.onclick = this.updateCursor.bind(this);
                        base.append(appendelem);
                    }
                    if ((!node.SubConditions || node.SubConditions.length < 2) && (!node.Variables || node.Variables.length < 2)) {
                        if ((!node.SubConditions || node.SubConditions.length < 1) && (!node.Variables || node.Variables.length < 1)){
                            const placeholder = document.createElement("span");
                            placeholder.classList.add("placeholder");
                            placeholder.innerText = translations["calc-missingvalue"];
                            placeholder.setAttribute("path",  path + "/placeholder:0");
                            placeholder.onclick = this.fillPlaceHolder.bind(this);
                            base.append(placeholder);
                        }
                        const divisionsign = document.createElement("span");
                        divisionsign.innerText = "÷";
                        base.append(divisionsign);
                        const placeholder = document.createElement("span");
                        placeholder.classList.add("placeholder");
                        placeholder.innerText = translations["calc-missingvalue"];
                        placeholder.setAttribute("path",  path + "/placeholder:0");
                        placeholder.onclick = this.fillPlaceHolder.bind(this);
                        base.append(placeholder);
                    }
                    break;
                case "MODULO":
                    const items_modulo = [];
                    for (const i in node.SubConditions) {
                        const child = document.createElement("span");
                        if (node.SubConditions[i].SubConditions && node.SubConditions[i].SubConditions.length > 1) {
                            child.classList.add("modulobracket");
                        }
                        child.classList.add("sub");
                        this.appendElem(node.SubConditions[i], child, path + "/sub:" + i);
                        if (child.childNodes.length && node.SubConditions[i].Operator != "PARAM" && node.SubConditions[i].Operator != "PARSEINT") {
                            const bracketbegin = document.createElement("span");
                            bracketbegin.innerText = "(";
                            bracketbegin.setAttribute("path",  path + "/sub:" + i + ":pre");
                            bracketbegin.onclick = this.updateCursor.bind(this);
                            child.prepend(bracketbegin);
                            const bracketend = document.createElement("span");
                            bracketend.innerText = ")";
                            bracketend.setAttribute("path",  path + "/sub:" + i);
                            bracketend.onclick = this.updateCursor.bind(this);
                            child.append(bracketend);
                        }
                        child.setAttribute("path",  path + "/sub:" + i);
                        child.onclick = this.updateCursor.bind(this);
                        items_modulo.push(child);
                    }
                    for (const i in node.Variables) {
                        const variableelem = document.createElement("span");
                        variableelem.classList.add("const");
                        variableelem.classList.add("modulo");
                        variableelem.setAttribute("path",  path + "/const:" + i);
                        variableelem.onclick = this.updateCursor.bind(this);
                        variableelem.innerText = node.Variables[i];
                        items_modulo.push(variableelem);
                    }
                    if ((!node.SubConditions || node.SubConditions.length < 2) && (!node.Variables || node.Variables.length < 2)) {
                        if ((!node.SubConditions || node.SubConditions.length < 1) && (!node.Variables || node.Variables.length < 1)){
                            const placeholder = document.createElement("span");
                            placeholder.classList.add("placeholder");
                            placeholder.innerText = translations["calc-missingvalue"];
                            placeholder.setAttribute("path",  path + "/placeholder:0");
                            placeholder.onclick = this.fillPlaceHolder.bind(this);
                            items_modulo.push(placeholder);
                        }
                        const placeholder = document.createElement("span");
                        placeholder.classList.add("placeholder");
                        placeholder.innerText = translations["calc-missingvalue"];
                        placeholder.setAttribute("path",  path + "/placeholder:0");
                        placeholder.onclick = this.fillPlaceHolder.bind(this);
                        items_modulo.push(placeholder);
                    }
                    const modulosentense = document.createElement("span");
                    modulosentense.classList.add("modulobracket", "sub");
                    modulosentense.innerHTML = translations["modulo-sentense"].replace("{0}", '<span></span>').replace("{1}", '<span></span>');
                    base.append(modulosentense);
                    const span1 = modulosentense.children[0];
                    const span2 = modulosentense.children[1];
                    span1.replaceWith(items_modulo[0]);
                    const dividedby = document.createElement("span");
                    for(const i in items_modulo.slice(1)) {
                        dividedby.append(items_modulo.slice(1)[i]);
                    }
                    span2.replaceWith(dividedby);
                    break;
                case "PARAM":
                    for (const i in node.Variables) {
                        const param = document.createElement("span");
                        param.classList.add("param");
                        param.classList.add("const");
                        param.innerText = this._getEventName(node.Variables[i]);
                        param.setAttribute("path",  path + "/param:" + i);
                        param.onclick = this.updateCursor.bind(this);
                        base.append(param);
                    }
                    break;
                case "PARSEINT":
                    const items_parseint = [];
                    for (const i in node.SubConditions) {
                        items_parseint.push(this.editor._summarize(node.SubConditions[i]));
                    }
                    for (const i in node.Variables) {
                        items_parseint.push(node.Variables[i]);
                    }
                    const param = document.createElement("span");
                    param.classList.add("parseint");
                    param.innerHTML = translations["translations-value"].replace("{0}", items_parseint.join(translations["valueof-joint"]));
                    param.setAttribute("path",  path);
                    param.onclick = this.updateCursor.bind(this);
                    base.append(param);
                    break;
            }
        }
    }

    /**
     * Appends an item to the calculation formula
     */
    appendItemToFormula(elem) {
        const cursorpath = document.getElementById("calccursorpos").value;
        let formula;
        if (document.getElementById("calcformula").value)
        {
            formula = JSON.parse(document.getElementById("calcformula").value);
            let targetcontainer = formula;
            if (cursorpath.split("/").length>2) {
                for (const i in cursorpath.split("/").slice(0, cursorpath.split("/").length-1)) {
                    const address = cursorpath.split("/")[i];
                    if (!address) {
                        continue;
                    }
                    const type = address.split(":")[0];
                    const index = address.split(":")[1];
                    if (type=="sub" || type == "placeholder") {
                        targetcontainer = targetcontainer.SubConditions[index];
                    } else if (type == "const") {
                        targetcontainer = targetcontainer.Variables[index];
                    }
                }
            }
            const address = cursorpath.split("/")[cursorpath.split("/").length-1];
            const type = address.split(":")[0];
            const index = address.split(":")[1];
            const prepending = address.split(":").length > 2 && address.split(":")[2] == "pre";
            if (cursorpath.length < 2 || type == "placeholder" || !address) {
                if (targetcontainer.SubConditions) {
                    targetcontainer.SubConditions.push(elem);
                } else {
                    targetcontainer.SubConditions = [elem];
                }
                document.getElementById("calccursorpos").value = document.getElementById("calccursorpos").value.replace("placeholder", "sub");
            } else if (type == "sub") {
                if (targetcontainer.SubConditions) {
                    targetcontainer.SubConditions.splice(index + (prepending?0:1), 0, elem);
                } else {
                    targetcontainer.SubConditions = [elem];
                }
            } else if (type == "const" || type == "param") { // even if the cursor is on "variable", cannot splice between variables since the appendance is SubCondition anyway. Append to the last of SubConditions
                if (targetcontainer.SubConditions) {
                    targetcontainer.SubConditions.push(elem);
                } else {
                    targetcontainer.SubConditions = [elem];
                }
            }
        } else {
            formula = elem;
        }
        document.getElementById("calcformula").value = JSON.stringify(formula);
        this.visualizeFormula();
        document.getElementById("calccursorpos").value = document.getElementById("calccursorpos").value.replace("placeholder", "sub");
        this.validate();
    }

    /**
     * Validates numeric formula
     */
    checkNumValid(formula, isRoot = false) {
        if ((!formula.SubConditions || !formula.SubConditions.length) && (!formula.Variables || !formula.Variables.length)){
            return false;
        }
        if (this.editor.calcoperators.includes(formula.Operator) && (formula.SubConditions ? formula.SubConditions.length : 0 + formula.Variables ? formula.Variables.length : 0) < (isRoot ? 1 : 2)) {
            return false;
        }
        let subcheck = true;
        for (const i in formula.SubConditions) {
            subcheck &&= this.checkNumValid(formula.SubConditions[i]);
        }
        return subcheck;
    }


    /**
     * Fills a placeholder in the calculation formula
     */
    fillPlaceHolder(e) {
        document.getElementById("calccursorpos").value = e.target.getAttribute("path");
        this.appendValue();
        event.stopPropagation();
    }
}

/**
 * Closes a modal by ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "none";
    }
}

/**
 * Updates test event parameter fields
 */
function updateTestEventParams() {
    console.log('updateTestEventParams called');
    // TODO: Implement dynamic parameter fields based on event type
}

/**
 * Runs a condition test
 */
function runConditionTest() {
    console.log('runConditionTest called');
    // TODO: Implement condition testing with API call
}

/**
 * Opens the Regex Tester modal
 */
function openRegexTester() {
    const modal = document.getElementById('regexTesterModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('regexPattern').focus();
    }
}
window.openRegexTester = openRegexTester;

/**
 * Tests a regex pattern against test string
 */
function testRegexPattern() {
    const pattern = document.getElementById('regexPattern').value.trim();
    const testString = document.getElementById('regexTestString').value;
    const resultDiv = document.getElementById('regexResult');
    
    if (!pattern) {
        resultDiv.textContent = 'Please enter a regex pattern';
        resultDiv.style.color = '#d32f2f';
        return;
    }
    
    try {
        const regex = new RegExp(pattern);
        const matches = testString.match(regex);
        
        if (matches) {
            resultDiv.textContent = `✓ Match found!\n\nMatched text: "${matches[0]}"${matches.length > 1 ? `\n\nCapture groups: ${matches.slice(1).map((m, i) => `[${i + 1}] "${m}"`).join(', ')}` : ''}`;
            resultDiv.style.color = '#2e7d32';
        } else {
            resultDiv.textContent = '✗ No match found';
            resultDiv.style.color = '#d32f2f';
        }
    } catch (err) {
        resultDiv.textContent = `✗ Invalid regex pattern:\n${err.message}`;
        resultDiv.style.color = '#d32f2f';
    }
}
window.testRegexPattern = testRegexPattern;

/**
 * Opens the Condition Snippets/Examples modal
 */
function openConditionExamples() {
    const modal = document.getElementById('conditionSnippetsModal');
    if (modal) {
        modal.style.display = 'block';
    }
}
window.openConditionExamples = openConditionExamples;

/**
 * Copies text to clipboard and shows feedback
 */
function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = element.textContent;
        const originalBg = element.style.backgroundColor;
        element.style.backgroundColor = '#4caf50';
        element.style.color = 'white';
        element.textContent = '✓ Copied!';
        
        setTimeout(() => {
            element.textContent = originalText;
            element.style.backgroundColor = originalBg;
            element.style.color = '';
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert(window._i18nMsg?.['condition.copyClipboardFailed'] || 'Could not copy to clipboard');
    });
}
window.copyToClipboard = copyToClipboard;

/**
 * Opens the Operator Reference modal
 */
function openOperatorReference() {
    const modal = document.getElementById('operatorRefModal');
    if (modal) {
        modal.style.display = 'block';
    }
}
window.openOperatorReference = openOperatorReference;
