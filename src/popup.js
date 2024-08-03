import L from "leaflet";
import * as d3 from "d3";

// Exemple de fonction pour mettre en évidence les connexions entre chercheurs
export const highlightConnections = (attribute, value) => {
  svgLayer.selectAll(".link").remove(); // Supprimez les liens existants

  const relatedResearchers = selectedResearchers.filter((researcher) => {
    if (Array.isArray(researcher[attribute])) {
      return researcher[attribute].includes(value);
    }
    return researcher[attribute] === value;
  });

  relatedResearchers.forEach((source) => {
    relatedResearchers.forEach((target) => {
      if (source !== target) {
        svgLayer
          .append("line")
          .attr("x1", source.x)
          .attr("y1", source.y)
          .attr("x2", target.x)
          .attr("y2", target.y)
          .attr("class", "link")
          .attr("stroke", "grey")
          .attr("stroke-width", 1);
      }
    });
  });
};
