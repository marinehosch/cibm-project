import L from "leaflet";
import * as d3 from "d3";

// Exemple de fonction pour afficher un popup avec des informations sur le chercheur
export const showResearcherPopup = (map, researcher, x, y) => {
  // Utiliser la latitude et longitude converties en coordonnées de la carte
  const popup = L.popup()
    .setLatLng(map.layerPointToLatLng([x, y]))
    .setContent(
      `
      <div>
        <h3>${researcher.name}</h3>
        <p><strong>Institution:</strong> ${researcher.institution}</p>
        <p><strong>Module:</strong> ${researcher.module}</p>
        <p><strong>Keywords:</strong> ${researcher.keywords.join(", ")}</p>
        <p><strong>Population Type:</strong> ${researcher.populationType.join(
          ", "
        )}</p>
        <p><strong>Age Group:</strong> ${researcher.ageGroup.join(", ")}</p>
        <p><strong>Health Status:</strong> ${researcher.healthStatus.join(
          ", "
        )}</p>
        <hr>
        <p>Select properties to highlight connections:</p>
        ${generateCheckbox("keywords", researcher.keywords)}
        ${generateCheckbox("populationType", researcher.populationType)}
        ${generateCheckbox("ageGroup", researcher.ageGroup)}
        ${generateCheckbox("healthStatus", researcher.healthStatus)}
      </div>
    `
    )
    .openOn(map);

  popup.on("remove", () => {
    d3.selectAll(".highlight-link").attr("class", "link");
  });

  d3.selectAll("input[type='checkbox']").on("change", () => {
    highlightConnections(researcher);
  });
};

// Fonction pour générer des cases à cocher pour les propriétés du chercheur
const generateCheckbox = (property, values) => {
  return values
    .map(
      (value) => `
      <label>
        <input type="checkbox" class="${property}-filter" value="${value}">
        ${value}
      </label>
    `
    )
    .join("");
};

// Fonction pour mettre en surbrillance les connexions basées sur les filtres
export const highlightConnections = (researcher) => {
  const selectedKeywords = Array.from(
    document.querySelectorAll(".keywords-filter:checked")
  ).map((cb) => cb.value);

  const selectedPopulationType = Array.from(
    document.querySelectorAll(".populationType-filter:checked")
  ).map((cb) => cb.value);

  const selectedAgeGroup = Array.from(
    document.querySelectorAll(".ageGroup-filter:checked")
  ).map((cb) => cb.value);

  const selectedHealthStatus = Array.from(
    document.querySelectorAll(".healthStatus-filter:checked")
  ).map((cb) => cb.value);

  d3.selectAll(".link").attr("class", "link");

  selectedResearchers.forEach((target) => {
    if (target !== researcher) {
      const hasCommonKeywords = selectedKeywords.some((kw) =>
        target.keywords.includes(kw)
      );
      const hasCommonPopulationType = selectedPopulationType.some((pt) =>
        target.populationType.includes(pt)
      );
      const hasCommonAgeGroup = selectedAgeGroup.some((ag) =>
        target.ageGroup.includes(ag)
      );
      const hasCommonHealthStatus = selectedHealthStatus.some((hs) =>
        target.healthStatus.includes(hs)
      );

      if (
        hasCommonKeywords ||
        hasCommonPopulationType ||
        hasCommonAgeGroup ||
        hasCommonHealthStatus
      ) {
        d3.selectAll(
          `line[x1='${researcher.x}'][y1='${researcher.y}'][x2='${target.x}'][y2='${target.y}'],
           line[x1='${target.x}'][y1='${target.y}'][x2='${researcher.x}'][y2='${researcher.y}']`
        ).attr("class", "highlight-link");
      }
    }
  });
};
