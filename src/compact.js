(function(scope) {

  const ATTRIBUTE_SEPARATORS = new Set([' ', '\n', '\r', '/', '>', '=']);
  const TAG_END = new Set(['/', '>']);
  const ELEMENT_NODE = 1;
  const TEXT_NODE = 3;

  function apply(parent, html, start, expectEnd) {
    let foundEnd = false;
    let i = start;
    let keyed = new Map();
    for (let j = 0; j < parent.children.length; j++) {
      let cur = parent.children[j]
      if (!cur.hasAttribute("key"))
        continue;
      keyed.set(cur.getAttribute("key"), cur);
    }
    // Find the first child without a key.
    let child = parent.firstChild;
    while (child && child.nodeType == ELEMENT_NODE && child.hasAttribute("key")) {
      child = child.nextSibling;
    }

    while (i < html.length) {
      let outputNode = child;
      if (html[i] == '<') {
        // Parse element
        let cur = ++i;
        let endTag = html[i] == '/';
        if (endTag) {
          cur = ++i;
        }
        while (i < html.length && !ATTRIBUTE_SEPARATORS.has(html[i])) {
          i++;
        }
        let tagName = html.substring(cur, i).toUpperCase();
        if (endTag) {
          // End of current tag, return position of closing.
          if (!expectEnd) {
            throw Error('Found unexpected early closing tag: ' + tagName);
          }
          if (tagName != parent.tagName) {
            throw Error('Closing tag does not match. Found ' + tagName + ' expected ' + parent.tagName);
          }
          if (html[i] != '>') {
            throw Error('Unexpected extra data after closing tag name');
          }
          while (i < html.length && html[i] != '>') {
            i++;
          }
          i++;
          foundEnd = true;
          break;
        }
        let attrs = new Map();
        // Parse attributes
        while (i < html.length && !TAG_END.has(html[i])) {
          // Find next attr name
          if (ATTRIBUTE_SEPARATORS.has(html[i])) {
            i++;
            continue;
          }
          cur = i;
          while (i < html.length && !ATTRIBUTE_SEPARATORS.has(html[i])) {
            i++;
          }
          let name = html.substring(cur, i);
          // Find = or next attribute.
          while (i < html.length && html[i] != '=' && ATTRIBUTE_SEPARATORS.has(html[i])) {
            i++;
          }
          if (html[i] != '=') {
            attrs.set(name, "");
            continue;
          }
          // If we found an =, parse value
          i++;
          while (i < html.length && ATTRIBUTE_SEPARATORS.has(html[i])) {
            i++;
          }
          if (html[i] == '"') {
            // Parse until closing quotation.
            cur = ++i;
            while (i < html.length && html[i] != '"') {
              i++;
            }
            attrs.set(name, html.substring(cur, i));
            i++; // skip closing quote.
          } else {
            // Parse until next attr separator
            cur = i;
            while (i < html.length && ATTRIBUTE_SEPARATORS.has(html[i])) {
              i++;
            }
            attrs.set(name, html.substring(cur, i));
          }
        }
        let selfClosing = false;
        if (html[i] == '/') {
          selfClosing = true;
          i += 2;
        } else {
          // Skip closing '>'
          i++;
        }
        if (attrs.has("key")) {
          let key = attrs.get("key");
          outputNode = keyed.get(key);
        }
        let match = outputNode && outputNode.nodeType == ELEMENT_NODE && outputNode.tagName == tagName;
        if (!match)
          outputNode = document.createElement(tagName);

        // Reconcile attributes
        // Remove attributes not in new output.
        for (const attr of outputNode.attributes) {
          if (!attrs.has(attr)) {
            outputNode.removeAttribute(attr);
          }
        }
        // Set present attributes if changed.
        for (const attr of attrs) {
          outputNode.setAttribute(attr[0], attr[1]);
        }
        // Now reconcile all children.
        if (!selfClosing) {
          i = apply(outputNode, html, i, true);
        }          
      } else {
        // Parse text
        let cur = i;
        while (i < html.length && html[i] != '<') {
          i++;
        }
        let text = html.substring(cur, i);
        if (!outputNode || outputNode.nodeType != TEXT_NODE || outputNode.data != text) {
          outputNode = document.createTextNode(text);
        }
      }
      // If the next child was matched, progress to the next child.
      if (outputNode == child) {
        do {
          child = child.nextSibling;
        } while (child && child.nodeType == ELEMENT_NODE && child.hasAttribute("key"));
      } else {
        // If the output node was not the next child, reposition / insert the output node
        // immediately before the child.
        parent.insertBefore(outputNode, child);
      }
    }
    // Remove any unmatched children.
    while (child) {
      let next = child.nextSibling;
      child.remove();
      child = next;
    }
    if (expectEnd && !foundEnd) {
      throw Error('No end tag found for ' + parent.tagName);
    }
    return i;
  }

  /**
   * Set the innerHTML, only updating the nodes which have changed.
   */
  scope.ShadowRoot.prototype.update = scope.Element.prototype.update = function(html) {
    apply(this, html, 0);
  }
})(window);