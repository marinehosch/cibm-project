import L, { svg, svgOverlay } from "leaflet";
import { getInstitutions, getResearchersByInstitution } from "./getDB.js";
import * as d3 from "d3";
import { createTimeSlider } from "./timeline.js";

// Initialisation de la carte Leaflet
const map = L.map("map").setView([46.45324993119597, 6.476370813913443], 9);
L.tileLayer(
  "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
  {
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenStreetMap</a>',
  }
).addTo(map);

L.svg().addTo(map);

d3.select(map.getPanes().overlayPane)
  .select("svg")
  .attr("pointer-events", "all");

// Fonction pour effacer les chercheurs et les liens si clic sur la carte
const clearResearchers = () => {
  selectedInstitutions = [];
  selectedResearchers = [];
  selectedInstitutions;
  highlightedAttributes = [];
};

const clearAll = () => {
  svgLayer.selectAll("*").remove();
  hidePopup();
};

map.on("click", clearResearchers, clearAll);

const svgLayer = d3.select(map.getPanes().overlayPane).select("svg");

// Fonction pour calculer la taille de l'icône en fonction du nombre de chercheurs
const calculateIconSize = (numResearchers) => {
  const minSize = 15;
  const maxSize = 70;
  const zoom = map.getZoom();

  if (zoom < 12) {
    return Math.min(maxSize, minSize + numResearchers * 1.5);
  } else if (zoom < 14) {
    return Math.min(maxSize, minSize + numResearchers * 1);
  } else if (zoom < 16) {
    return Math.min(maxSize, minSize + numResearchers * 0.5);
  } else if (zoom < 18) {
    return Math.min(maxSize, minSize + numResearchers * 0.25);
  } else {
    return Math.min(maxSize, minSize + numResearchers * 0.1);
  }
};

// Variables globales pour les données
let researchers = [];
let institutions = [];
let selectedResearchers = [];
let selectedInstitutions = [];
let highlightedAttributes = [];
let selectedResearcherForPopup = null;
let institutionMarkersLayer = L.layerGroup().addTo(map);

// Palette de couleurs personnalisée pour les modules
const moduleColors = d3
  .scaleOrdinal()
  .domain(["MRI", "EEG", "SP", "DS", "PET"])
  .range(["#304F5A", "#FBB522", "#4592ac", "#00008B", "#000000"]);

// Forme des symboles par module
const moduleShapes = {
  MRI: d3.symbolCircle,
  EEG: d3.symbolSquare,
  SP: d3.symbolTriangle,
  DS: d3.symbolDiamond,
  PET: d3.symbolWye,
};

// Fonction pour initialiser les données
const initializeData = async () => {
  try {
    researchers = await getResearchersByInstitution();
    institutions = await getInstitutions();
    // Convertir les dates
    researchers = researchers.map((r) => ({
      ...r,
      arrivalDate: new Date(
        r.arrivalDate.year.low,
        r.arrivalDate.month.low - 1,
        r.arrivalDate.day.low
      ),
      departureDate: r.departureDate
        ? new Date(
            r.departureDate.year.low,
            r.departureDate.month.low - 1,
            r.departureDate.day.low
          )
        : null,
    }));
    console.log("Data initialized successfully", researchers, institutions);
    return { researchers, institutions };
  } catch (error) {
    console.error("Error initializing data:", error);
    return { researchers: [], institutions: [] };
  }
};

// Fonction pour mettre à jour les chercheurs sélectionnés en fonction des institutions et des modules
const updateSelectedResearchers = () => {
  const selectedModules = Array.from(
    document.querySelectorAll(".module-filter:checked")
  ).map((cb) => cb.value);

  if (selectedInstitutions.length === 0 && selectedModules.length === 0) {
    selectedResearchers = researchers;
  } else if (selectedInstitutions.length === 0) {
    selectedResearchers = researchers.filter((researcher) =>
      selectedModules.includes(researcher.module)
    );
  } else if (selectedModules.length === 0) {
    selectedResearchers = researchers.filter((researcher) =>
      selectedInstitutions.includes(researcher.institution)
    );
  } else {
    selectedResearchers = researchers.filter(
      (researcher) =>
        selectedInstitutions.includes(researcher.institution) &&
        selectedModules.includes(researcher.module)
    );
  }

  console.log("Selected Researchers:", selectedResearchers);
  displaySelectedResearchers(selectedResearchers, selectedModules);
};

const findCommonResearchers = () => {
  if (!researchers || researchers.length === 0) {
    return [];
  }

  return researchers.filter((researcher) => {
    return highlightedAttributes.every(({ attribute, value }) => {
      const attrValue = researcher[attribute];
      if (Array.isArray(attrValue)) {
        return attrValue.some(
          (val) => val.toLowerCase() === value.toLowerCase()
        );
      } else if (typeof attrValue === "string") {
        return attrValue.toLowerCase() === value.toLowerCase();
      } else {
        return false;
      }
    });
  });
};

// Fonction pour afficher les chercheurs sélectionnés autour des institutions
const displaySelectedResearchers = (selectedResearchers, selectedModules) => {
  svgLayer.selectAll("*").remove();

  const institutionMap = new Map(institutions.map((inst) => [inst.name, inst]));

  // Positionnement des chercheurs autour de leur institution
  selectedResearchers.forEach((researcher, i) => {
    const institution = institutionMap.get(researcher.institution);
    if (!institution || !institution.latitude || !institution.longitude) return;

    const center = map.latLngToLayerPoint([
      institution.latitude,
      institution.longitude,
    ]);
    const radius = 100;
    const angleStep = (2 * Math.PI) / selectedResearchers.length;

    const angle = i * angleStep;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);

    // Ajouter les éléments (shapes en fonction du module) pour chaque chercheur
    const shape = svgLayer
      .append("path")
      .attr("d", d3.symbol().type(moduleShapes[researcher.module]).size(100))
      .attr("transform", `translate(${x}, ${y})`)
      .attr("fill", "#0071B2")
      .attr("opacity", 0.7)
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.7)
      .attr("pointer-events", "all")
      .on("mouseover", function () {
        d3.select(this).attr("opacity", 1);
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0.7);
      })
      .on("click", () => {
        showPopup(researcher);
        //fixer le nom du chercheur sélectionné
        selectedResearcherForPopup = researcher;
        //afficher le texte du nom du chercheur sélectionné comme au hover
        d3.select(text).attr("visibility", "visible");
      });

    // Ajouter un cercle pour chaque chercheur en invisible pour rendre la zone cliquable
    const circle = svgLayer
      .append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 7)
      .attr("fill", moduleColors(researcher.module))
      .attr("opacity", 0)
      .attr("stroke", "grey")
      .on("mouseover", () => {
        text.attr("visibility", "visible");
      })
      .on("mouseout", () => {
        text.attr("visibility", "hidden");
      })
      .on("click", () => {
        showPopup(researcher);
      });

    const institutionColors = {
      EPFL: "#FF0000", // Rouge
      CIBM: "#304F5A", // Bleu-gris
      HUG: "#55B7B1", // Turquoise
      CHUV: "#009933", // Vert
      UNIL: "#1C95CD", // Bleu clair
      UNIGE: "#CF0063", // Rose
    };

    // Ajouter le lien entre les chercheurs et leur institution
    const linkColor = institutionColors[researcher.institution] || "GREY"; // Couleur par défaut si institution non trouvée
    svgLayer
      .append("line")
      .attr("x1", x)
      .attr("y1", y)
      .attr("x2", center.x)
      .attr("y2", center.y)
      .attr("stroke", linkColor)
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", 1);

    const text = svgLayer
      .append("text")
      .attr("x", x + 10)
      .attr("y", y + 5)
      .text(
        `${researcher.name}, ${researcher.module}, ${researcher.institution}`
      )
      .attr("font-size", "12px")
      .attr("fill", "black")
      .attr("font-weight", "bold")
      .attr("font-family", "Arial")
      .attr("visibility", "hidden")
      .on("mouseover", () => {
        text.attr("visibility", "visible");
      })
      .on("mouseout", () => {
        text.attr("visibility", "hidden");
      })
      .on("click", () => {
        showPopup(researcher);
      });

    // Ajout d'une rotation conditionnelle au texte pour qu'il soit à l'endroit
    let angleDegrees = angle * (180 / Math.PI);
    if (angleDegrees > 90 && angleDegrees < 270) {
      angleDegrees += 180;
      text
        .attr("transform", `rotate(${angleDegrees}, ${x}, ${y})`)
        .attr("text-anchor", "end")
        .attr("x", x - 10);
    } else {
      text
        .attr("transform", `rotate(${angleDegrees}, ${x}, ${y})`)
        .attr("text-anchor", "start")
        .attr("x", x + 10);
    }

    researcher.x = x;
    researcher.y = y;
  });
};

// Fonction pour mettre à jour la position des chercheurs et des lignes
const updatePositions = () => {
  const selectedModules = Array.from(
    document.querySelectorAll(".module-filter:checked")
  ).map((cb) => cb.value);
  displaySelectedResearchers(selectedResearchers, selectedModules);
  highlightConnections();
};

map.on("zoomend", updatePositions);
map.on("moveend", updatePositions);

// Fonction pour générer des icônes personnalisées pour chaque institution
const customIcon = (institutionName, size) =>
  L.icon({
    iconUrl: `/src/icons/${institutionName}.svg`,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1]],
  });

// Fonction pour cacher la div d'information sur le chercheur
const hidePopup = () => {
  d3.select("#researcher-popup")
    .transition()
    .duration(200)
    .style("opacity", 0)
    .on("end", function () {
      d3.select(this).classed("hidden", true);
    });
  svgLayer.selectAll("*").remove();
};

const showPopup = (researcher) => {
  const popupDiv = d3.select("#researcher-popup");
  const popupContent = `
    <div>
      <a id="close" href="#">&times;</a>
      <h3>${researcher.name}</h3>
      <p><strong>Institution:</strong> <span class="highlightable" data-attribute="institution">${
        researcher.institution
      }</span></p>
      <p><strong>Technologie:</strong> <span class="highlightable" data-attribute="module">${
        researcher.module
      }</span></p>
      <p><strong>Expertise:</strong> ${researcher.keywords
        .map(
          (keyword) =>
            `<span class="highlightable" data-attribute="keywords">${keyword}</span>`
        )
        .join(", ")}</p>
      <p><strong>Type de population:</strong> <span class="highlightable" data-attribute="populationType">${
        researcher.populationType
      }</span></p>
      <p><strong>Groupe d'âge:</strong> ${researcher.ageGroup
        .map(
          (age) =>
            `<span class="highlightable" data-attribute="ageGroup">${age}</span>`
        )
        .join(", ")}</p>
      <p><strong>Statut de santé:</strong> ${researcher.healthStatus
        .map(
          (status) =>
            `<span class="highlightable" data-attribute="healthStatus">${status}</span>`
        )
        .join(", ")}</p>
        
    </div>
    <div class="instructions">
          <p>Click on the attributes in the description to display the researchers who share the same attribute(s).</p>
          </div>

  `;

  popupDiv
    .html(popupContent)
    .classed("hidden", false)
    .transition()
    .duration(200)
    .style("opacity", 1);

  selectedResearcherForPopup = researcher;

  //événement pour cacher le pop-up au clic sur la croix
  document.getElementById("close").addEventListener("click", (event) => {
    event.preventDefault();
    hidePopup();
  });

  // Ajoutez des événements de clic sur les attributs des chercheurs
  d3.selectAll(".highlightable").on("click", function () {
    const element = d3.select(this);
    const attribute = element.attr("data-attribute");
    const value = element.text().trim();

    console.log(`Clicked on attribute: ${attribute}, value: ${value}`);

    // Toggle highlight class
    const isHighlighted = element.classed("highlight");
    element.classed("highlight", !isHighlighted);

    // Mettre à jour la liste des attributs mis en évidence
    if (isHighlighted) {
      highlightedAttributes = highlightedAttributes.filter(
        (attr) => attr.attribute !== attribute || attr.value !== value
      );
    } else {
      highlightedAttributes.push({ attribute, value });
    }

    // Afficher les chercheurs ayant les attributs mis en évidence
    highlightConnections();
  });
};

const highlightConnections = () => {
  svgLayer.selectAll(".attribute-link").remove(); // Supprime les liens existants

  const commonResearchers = findCommonResearchers();

  if (commonResearchers.length === 0) {
    console.log("No common researchers found");
    return;
  }

  console.log("Common Researchers:", commonResearchers);

  // Ajout des liens entre les chercheurs ayant les mêmes attributs
  commonResearchers.forEach((target) => {
    if (selectedResearcherForPopup && selectedResearcherForPopup !== target) {
      svgLayer
        .append("line")
        .attr("class", "attribute-link")
        .attr("x1", selectedResearcherForPopup.x)
        .attr("y1", selectedResearcherForPopup.y)
        .attr("x2", target.x)
        .attr("y2", target.y)
        .attr("stroke", "blue") // Couleur des liens pour les attributs
        .attr("stroke-opacity", 0.5)
        .attr("stroke-width", 1);
    }
  });

  // Mettre à jour selectedResearchers avec les chercheurs ayant les attributs mis en évidence
  selectedResearchers = commonResearchers;
  const selectedModules = Array.from(
    document.querySelectorAll(".module-filter:checked")
  ).map((cb) => cb.value);
  displaySelectedResearchers(selectedResearchers, selectedModules);

  // Zoom out to fit all researchers in view
  if (commonResearchers.length > 0) {
    const bounds = L.latLngBounds(
      commonResearchers.map((researcher) => [
        researcher.latitude,
        researcher.longitude,
      ])
    );
    map.fitBounds(bounds);
  }
};

// Fonction pour ajouter des marqueurs pour chaque institution sur la carte
const addInstitutionMarkers = (selectedYear) => {
  institutionMarkersLayer.clearLayers(); // Supprime les marqueurs existants

  institutions.forEach((institution) => {
    if (!institution.latitude || !institution.longitude) return;

    const numResearchers = researchers.filter(
      (r) =>
        r.institution === institution.name &&
        r.arrivalDate.getFullYear() <= selectedYear &&
        (r.departureDate ? r.departureDate.getFullYear() >= selectedYear : true)
    ).length;

    const iconSize = calculateIconSize(numResearchers);

    const marker = L.marker([institution.latitude, institution.longitude], {
      icon: customIcon(institution.name, [iconSize, iconSize]),
    })
      .addTo(institutionMarkersLayer)
      .bindPopup(institution.name)
      .openPopup();

    marker.on("mouseover", () => {
      marker.openPopup();
    });

    marker.on("click", () => {
      selectedInstitutions = [institution.name];
      updateSelectedResearchers();
    });
  });
};

// Fonction pour initialiser les filtres de module
const setupFilters = () => {
  document.querySelectorAll(".module-filter").forEach((checkbox) => {
    checkbox.checked = false;
    checkbox.addEventListener("change", () => {
      updateSelectedResearchers();
    });
  });

  document.getElementById("reset-filters").addEventListener("click", () => {
    document.querySelectorAll(".module-filter").forEach((checkbox) => {
      checkbox.checked = false;
    });
    selectedInstitutions = [];
    highlightedAttributes = [];
    selectedResearchers = researchers;
    displaySelectedResearchers(selectedResearchers, []);
    svgLayer.selectAll("*").remove();
    hidePopup();
    d3.select("#year-label").text(2024);
    d3.select(".handle").attr("cx", "971.1924307939167");
  });
};

const updateMap = (selectedYear) => {
  const filteredResearchers = researchers.filter((r) => {
    const arrivalYear = r.arrivalDate.getFullYear();
    const departureYear = r.departureDate
      ? r.departureDate.getFullYear()
      : new Date().getFullYear();
    return arrivalYear <= selectedYear && departureYear >= selectedYear;
  });

  displaySelectedResearchers(filteredResearchers);
  addInstitutionMarkers(selectedYear); // Ajoutez ceci pour mettre à jour les marqueurs des institutions
};

// Appel de l'initialisation de la carte et des données
initializeData().then(() => {
  setupFilters();
  createTimeSlider(updateMap);
  updateMap(new Date().getFullYear()); // Initialiser la carte avec l'année courante
});

// Initialisation de la div pour le graphique de réseau
const networkChartDiv = L.control({ position: "bottomright" });
networkChartDiv.onAdd = function () {
  const div = L.DomUtil.create("div", "network-chart");
  div.id = "network-chart";
  return div;
};
networkChartDiv.addTo(map);
