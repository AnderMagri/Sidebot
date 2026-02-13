figma.showUI(__html__, { width: 400, height: 450, title: "Sidebot Gemini" });

figma.ui.onmessage = async (msg) => {
  // Load saved API key
  if (msg.type === 'load-api-key') {
    const savedKey = await figma.clientStorage.getAsync('gemini-api-key');
    figma.ui.postMessage({ type: 'api-key-loaded', key: savedKey });
    return;
  }

  // Save API key
  if (msg.type === 'save-api-key') {
    await figma.clientStorage.setAsync('gemini-api-key', msg.key);
    return;
  }

  // Clear API key
  if (msg.type === 'clear-api-key') {
    await figma.clientStorage.deleteAsync('gemini-api-key');
    return;
  }

  if (msg.type === 'get-context') {
    const scope = msg.scope || 'selection';
    let nodes = [];
    
    if (scope === 'page') {
      // Get all nodes on current page (excluding background and locked layers)
      nodes = figma.currentPage.findAll(node => {
        // Skip locked nodes and the page background
        if (node.locked) return false;
        if (node.type === 'SLICE') return false;
        
        // Only include visible nodes
        if ('visible' in node && !node.visible) return false;
        
        // Include shapes, text, frames, groups, components, instances
        return ['RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'LINE', 'TEXT', 
                'FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 'VECTOR'].includes(node.type);
      });
      
      // Limit to 50 nodes to avoid overwhelming the AI
      if (nodes.length > 50) {
        figma.notify(`⚠️ Found ${nodes.length} layers. Using first 50. Consider selecting specific layers.`);
        nodes = nodes.slice(0, 50);
      }
    } else {
      // Use selected nodes
      nodes = figma.currentPage.selection;
      if (nodes.length === 0) {
        figma.notify("❌ Select layers first, or choose 'Current page' mode!");
        return;
      }
    }
    
    const context = nodes.map(node => {
      const info = {
        id: node.id,
        name: node.name,
        type: node.type,
        x: Math.round(node.x),
        y: Math.round(node.y),
        width: Math.round('width' in node ? node.width : 0),
        height: Math.round('height' in node ? node.height : 0),
      };

      // Add Auto Layout info for frames
      if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        info.layoutMode = node.layoutMode || 'NONE'; // NONE, HORIZONTAL, VERTICAL
        if (node.layoutMode !== 'NONE') {
          info.layoutPadding = {
            top: node.paddingTop,
            right: node.paddingRight,
            bottom: node.paddingBottom,
            left: node.paddingLeft
          };
          info.itemSpacing = node.itemSpacing;
          info.primaryAxisAlignItems = node.primaryAxisAlignItems; // MIN, CENTER, MAX, SPACE_BETWEEN
          info.counterAxisAlignItems = node.counterAxisAlignItems; // MIN, CENTER, MAX
        }
      }

      // Add layout positioning info for child nodes
      if (node.parent && (node.parent.type === 'FRAME' || node.parent.type === 'COMPONENT' || node.parent.type === 'INSTANCE')) {
        if (node.parent.layoutMode !== 'NONE') {
          info.layoutAlign = node.layoutAlign; // INHERIT, STRETCH, MIN, CENTER, MAX
          info.layoutGrow = node.layoutGrow; // 0 or 1
        }
      }

      // Add text content and font info for TEXT nodes
      if (node.type === "TEXT") {
        info.text = node.characters;
        // Get font info
        try {
          const fontName = node.fontName;
          if (fontName && typeof fontName === 'object' && 'family' in fontName) {
            info.fontFamily = fontName.family;
            info.fontStyle = fontName.style;
          }
        } catch (e) {
          // Mixed fonts - just note it
          info.fontFamily = "mixed";
        }
      }

      // Add fill colors for nodes that have fills
      if ("fills" in node && node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
        const fills = node.fills.filter(f => f.type === 'SOLID' && f.visible !== false);
        if (fills.length > 0) {
          info.fillColors = fills.map(f => {
            const r = Math.round(f.color.r * 255);
            const g = Math.round(f.color.g * 255);
            const b = Math.round(f.color.b * 255);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          });
        }
      }

      // Add stroke colors for nodes that have strokes
      if ("strokes" in node && node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0) {
        const strokes = node.strokes.filter(s => s.type === 'SOLID' && s.visible !== false);
        if (strokes.length > 0) {
          info.strokeColors = strokes.map(s => {
            const r = Math.round(s.color.r * 255);
            const g = Math.round(s.color.g * 255);
            const b = Math.round(s.color.b * 255);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          });
        }
      }

      return info;
    });

    figma.ui.postMessage({ type: 'context-data', data: context });
  }

  if (msg.type === 'apply-changes') {
    const changes = msg.changes;
    let appliedCount = 0;

    for (const change of changes) {
      // Try to find the node by ID, then by Name as a backup
      let node = figma.getNodeById(change.id) || figma.currentPage.findOne(n => n.name === change.name);
      
      if (node) {
        try {
          // Apply Position
          if (change.x !== undefined) node.x = Number(change.x);
          if (change.y !== undefined) node.y = Number(change.y);

          // Apply Size
          if (change.width !== undefined && 'resize' in node) {
            const newWidth = Number(change.width);
            const currentHeight = 'height' in node ? node.height : 100;
            node.resize(newWidth, currentHeight);
          }
          if (change.height !== undefined && 'resize' in node) {
            const currentWidth = 'width' in node ? node.width : 100;
            const newHeight = Number(change.height);
            node.resize(currentWidth, newHeight);
          }

          // Apply Auto Layout settings
          if (change.layoutMode && (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE')) {
            if (change.layoutMode === 'HORIZONTAL' || change.layoutMode === 'VERTICAL') {
              node.layoutMode = change.layoutMode;
            } else if (change.layoutMode === 'NONE') {
              node.layoutMode = 'NONE';
            }
          }

          // Apply Auto Layout padding
          if (change.layoutPadding && node.layoutMode !== 'NONE') {
            if (typeof change.layoutPadding === 'number') {
              // Single value for all sides
              node.paddingTop = node.paddingBottom = node.paddingLeft = node.paddingRight = change.layoutPadding;
            } else if (typeof change.layoutPadding === 'object') {
              if (change.layoutPadding.top !== undefined) node.paddingTop = change.layoutPadding.top;
              if (change.layoutPadding.right !== undefined) node.paddingRight = change.layoutPadding.right;
              if (change.layoutPadding.bottom !== undefined) node.paddingBottom = change.layoutPadding.bottom;
              if (change.layoutPadding.left !== undefined) node.paddingLeft = change.layoutPadding.left;
            }
          }

          // Apply item spacing (gap between children)
          if (change.itemSpacing !== undefined && node.layoutMode !== 'NONE') {
            node.itemSpacing = Number(change.itemSpacing);
          }

          // Apply alignment (for Auto Layout frames)
          if (change.primaryAxisAlignItems && node.layoutMode !== 'NONE') {
            node.primaryAxisAlignItems = change.primaryAxisAlignItems; // MIN, CENTER, MAX, SPACE_BETWEEN
          }
          if (change.counterAxisAlignItems && node.layoutMode !== 'NONE') {
            node.counterAxisAlignItems = change.counterAxisAlignItems; // MIN, CENTER, MAX, BASELINE
          }

          // Apply child alignment within Auto Layout parent
          if (change.layoutAlign && node.parent && node.parent.layoutMode !== 'NONE') {
            node.layoutAlign = change.layoutAlign; // INHERIT, STRETCH, MIN, CENTER, MAX
          }
          if (change.layoutGrow !== undefined && node.parent && node.parent.layoutMode !== 'NONE') {
            node.layoutGrow = Number(change.layoutGrow); // 0 or 1
          }

          // Apply Text - FIX: Load all fonts for mixed formatting
          if (change.text && node.type === "TEXT") {
            // Load all fonts used in the text node (handles mixed formatting)
            const fontNames = node.getRangeAllFontNames(0, node.characters.length);
            await Promise.all(fontNames.map(font => figma.loadFontAsync(font)));
            node.characters = String(change.text);
          }

          // Apply Font Family/Style
          if ((change.fontFamily || change.fontStyle) && node.type === "TEXT") {
            const fontNames = node.getRangeAllFontNames(0, node.characters.length);
            await Promise.all(fontNames.map(font => figma.loadFontAsync(font)));
            
            const newFont = {
              family: change.fontFamily || (typeof node.fontName === 'object' ? node.fontName.family : 'Inter'),
              style: change.fontStyle || (typeof node.fontName === 'object' ? node.fontName.style : 'Regular')
            };
            
            try {
              await figma.loadFontAsync(newFont);
              node.fontName = newFont;
            } catch (e) {
              console.error("Font not available:", newFont, e);
              figma.notify(`⚠️ Font "${newFont.family} ${newFont.style}" not available`);
            }
          }

          // Apply Fill Color (background/fill)
          if (change.fillColor && "fills" in node) {
            node.fills = [{ type: 'SOLID', color: hexToRgb(change.fillColor) }];
          }

          // Apply Stroke Color (border/outline)
          if (change.strokeColor && "strokes" in node) {
            node.strokes = [{ type: 'SOLID', color: hexToRgb(change.strokeColor) }];
          }

          // Legacy "color" field - apply to fills for backwards compatibility
          if (change.color && !change.fillColor && "fills" in node) {
            node.fills = [{ type: 'SOLID', color: hexToRgb(change.color) }];
          }
          appliedCount++;
        } catch (e) {
          console.error("Error updating node:", e);
          figma.notify(`⚠️ Couldn't update "${node.name}": ${e.message}`);
        }
      }
    }
    
    // Send feedback to UI
    if (appliedCount > 0) {
      const timing = msg.timing ? ` (${msg.timing.total}s total)` : '';
      const message = `✅ Success: Updated ${appliedCount} layers${timing}`;
      figma.notify(message);
      figma.ui.postMessage({ type: 'changes-applied', message: message });
    } else {
      const message = "⚠️ Gemini sent changes, but I couldn't find those layers.";
      figma.notify(message);
      figma.ui.postMessage({ type: 'changes-applied', message: message });
    }
  }
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}
