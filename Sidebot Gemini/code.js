figma.showUI(__html__, { width: 400, height: 450, title: "Gemini Copilot" });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get-context') {
    const selection = figma.currentPage.selection;
    const context = selection.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      x: Math.round(node.x),
      y: Math.round(node.y),
      text: node.type === "TEXT" ? node.characters : ""
    }));

    if (context.length === 0) {
      figma.notify("❌ Select a layer first!");
      return;
    }
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

          // Apply Text
          if (change.text && node.type === "TEXT") {
            await figma.loadFontAsync(node.fontName);
            node.characters = String(change.text);
          }

          // Apply Color
          if (change.color && "fills" in node) {
            node.fills = [{ type: 'SOLID', color: hexToRgb(change.color) }];
          }
          appliedCount++;
        } catch (e) {
          console.error("Error updating node:", e);
        }
      }
    }
    
    if (appliedCount > 0) {
      figma.notify(`✅ Success: Updated ${appliedCount} layers.`);
    } else {
      figma.notify("⚠️ Gemini sent changes, but I couldn't find those layers.");
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