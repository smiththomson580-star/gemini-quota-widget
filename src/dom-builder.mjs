import { parseFragment } from 'parse5';

// Parse the widget's own templates as data, then use DOM node APIs.
// No HTML-string browser sink or Trusted Types policy is created.
export function setHTML(target, markup) {
  const doc = target.ownerDocument;
  function create(node) {
    if (node.nodeName === '#text') return doc.createTextNode(node.value);
    if (node.nodeName === '#comment') return doc.createComment(node.data);
    if (!node.tagName) return null;
    if (['script', 'iframe', 'object', 'embed'].includes(node.tagName.toLowerCase())) return null;
    const element = doc.createElementNS(node.namespaceURI, node.tagName);
    for (const attr of node.attrs || []) {
      if (/^on/i.test(attr.name)) continue;
      if (/^(?:href|src|action)$/i.test(attr.name) && /^\s*javascript:/i.test(attr.value)) continue;
      const name = attr.prefix ? `${attr.prefix}:${attr.name}` : attr.name;
      if (attr.namespace) element.setAttributeNS(attr.namespace, name, attr.value);
      else element.setAttribute(name, attr.value);
    }
    const parent = node.tagName === 'template' ? element.content : element;
    for (const child of (node.content || node).childNodes || []) {
      const result = create(child);
      if (result) parent.appendChild(result);
    }
    return element;
  }
  const tree = parseFragment(String(markup));
  const children = tree.childNodes.map(create).filter(Boolean);
  target.replaceChildren(...children);
}
