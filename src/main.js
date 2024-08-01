import L from "leaflet";
import { getInstitutions, getResearchersByInstitution } from "./getDB.js";
import * as d3 from "d3";
import { showResearcherPopup, highlightConnections } from "./popup.js";

// Initialisation de la carte Leaflet
const map = L.map("map").setView([46.51999710099841, 6.569531292590334], 12);
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

// Fonction pour effacer les chercheurs si clic sur la carte
const clearResearchers = () => {
  selectedInstitutions = [];
  updateSelectedResearchers();
};

map.on("click", clearResearchers);

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

// Fonction pour ajuster l'angle de rotation du texte
const adjustTextAngle = (angle) => {
  let degree = angle * (180 / Math.PI);
  if (degree > 90 && degree < 270) {
    degree += 180;
  }
  return degree;
};

// Variables globales pour les données
let researchers = [];
let institutions = [];
let selectedResearchers = [];
let selectedInstitutions = [];

// Palette de couleurs personnalisée pour les modules
const moduleColors = d3
  .scaleOrdinal()
  .domain(["MRI", "EEG", "SP", "DS", "PET"])
  .range(["#304F5A", "#FBB522", "#4592ac", "#00008B", "#000000"]);

// Fonction pour créer un symbole hexagonal
// const hexagon = d3.symbol().type((size) => {
//   const sqrt3 = Math.sqrt(3);
//   const points = [
//     [0, 1],
//     [sqrt3 / 2, 0.5],
//     [sqrt3 / 2, -0.5],
//     [0, -1],
//     [-sqrt3 / 2, -0.5],
//     [-sqrt3 / 2, 0.5],
//     [0, 1],
//   ];
//   const path = d3.path();
//   points.forEach((point, i) => {
//     const x = point[0] * size;
//     const y = point[1] * size;
//     if (i === 0) {
//       path.moveTo(x, y);
//     } else {
//       path.lineTo(x, y);
//     }
//   });
//   return path.toString();
// });

//forme des symboles par module
const moduleShapes = {
  MRI: d3.symbolCircle,
  EEG: d3.symbolSquare,
  SP: d3.symbolTriangle,
  DS: d3.symbolDiamond,
  //dessiner un hexagone pour le module PET
  PET: d3.symbolWye,
};

// Fonction pour initialiser les données
const initializeData = async () => {
  try {
    researchers = await getResearchersByInstitution();
    institutions = await getInstitutions();
    console.log("Researchers:", researchers); // Debug
    console.log("Institutions:", institutions); // Debug
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
    selectedResearchers = [];
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

  displaySelectedResearchers(selectedResearchers);
};

// Fonction pour afficher les chercheurs sélectionnés autour des institutions
const displaySelectedResearchers = (selectedResearchers) => {
  svgLayer.selectAll("*").remove();

  const institutionMap = new Map(institutions.map((inst) => [inst.name, inst]));

  // Positionnement des chercheurs autour de leur institution
  selectedResearchers.forEach((researcher) => {
    const institution = institutionMap.get(researcher.institution);
    if (!institution || !institution.latitude || !institution.longitude) return;

    const center = map.latLngToLayerPoint([
      institution.latitude,
      institution.longitude,
    ]);
    const radius = 100;
    const angleStep = (2 * Math.PI) / selectedResearchers.length;

    const index = selectedResearchers.indexOf(researcher);
    const angle = index * angleStep;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);

    //ajouter les éléments (shapes en fonction du module) pour chaque chercheur
    const shape = svgLayer
      .append("path")
      .attr("d", d3.symbol().type(moduleShapes[researcher.module]).size(100))
      // .attr("d", d3.symbol().type(d3.symbolCircle))
      .attr("transform", `translate(${x}, ${y})`)
      .attr("fill", "#0071B2")
      .attr("opacity", 0.7)
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.7)
      .attr("r", 7)
      .attr("pointer-events", "all")
      .on("mouseover", () => {
        text.attr("visibility", "visible");
      })
      .on("mouseout", () => {
        text.attr("visibility", "hidden");
      })
      .on("click", () => {
        console.log("Clicked on researcher:", researcher); // Debug
        showPopup(researcher);
      });

    // Ajouter les éléments (cercles) pour chaque chercheur en invisible pour rendre la zone cliquable
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
        console.log("Clicked on researcher circle:", researcher); // Debug
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

    //ajout du lien entre les chercheurs et leur institution
    const linkColor = institutionColors[researcher.institution] || "GREY"; // Couleur par défaut si institution non trouvée
    const link = svgLayer
      .append("line")
      .attr("x1", x)
      .attr("y1", y)
      .attr("x2", center.x)
      .attr("y2", center.y)
      .attr(
        "stroke", //couleur en fonction de l'institution
        linkColor
      )
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

  // Regrouper les liens entre chercheurs partageant le même module
  const linkMap = new Map();

  selectedResearchers.forEach((source) => {
    selectedResearchers.forEach((target) => {
      if (source !== target && source.module === target.module) {
        const key = [source.x, source.y, target.x, target.y].sort().join(",");
        if (!linkMap.has(key)) {
          linkMap.set(key, {
            count: 0,
            x1: source.x,
            y1: source.y,
            x2: target.x,
            y2: target.y,
          });
        }
        linkMap.get(key).count += 1;
      }
    });
  });

  // Dessiner les liens regroupés
  linkMap.forEach((link, key) => {
    const { count, x1, y1, x2, y2 } = link;
    svgLayer
      .append("line")
      .attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x2)
      .attr("y2", y2)
      .attr("stroke", d3.interpolateTurbo(Math.min(1, count / 10)))
      .attr("stroke-opacity", Math.min(1, count / 10))
      .attr("stroke-width", Math.min(5, count));
  });
};

// Fonction pour mettre à jour la position des chercheurs et des lignes
const updatePositions = () => {
  displaySelectedResearchers(selectedResearchers);
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
// Fonction pour afficher une div avec les informations sur le chercheur
const showPopup = (researcher) => {
  console.log("showPopup called with:", researcher); // Debug
  const popupDiv = d3.select("#researcher-popup");

  const popupContent = `
    <div>
      <strong>${researcher.name}</strong><br>
      Module: ${researcher.module}<br>
      Institution: ${researcher.institution}
    </div>
  `;

  popupDiv
    .html(popupContent)
    .classed("hidden", false)
    .transition()
    .duration(200)
    .style("opacity", 1);
};

// Fonction pour cacher la div du pop-up
const hidePopup = () => {
  d3.select("#researcher-popup")
    .transition()
    .duration(200)
    .on("end", function () {
      d3.select(this).classed("hidden", true);
    });
};

// Ajoutez un événement pour cacher le pop-up lorsque vous cliquez sur la carte
map.on("click", hidePopup);

// Fonction pour ajouter des marqueurs pour chaque institution sur la carte
const addInstitutionMarkers = () => {
  institutions.forEach((institution) => {
    if (!institution.latitude || !institution.longitude) return;

    const numResearchers = researchers.filter(
      (r) => r.institution === institution.name
    ).length;
    const iconSize = calculateIconSize(numResearchers);

    const marker = L.marker([institution.latitude, institution.longitude], {
      icon: customIcon(institution.name, [iconSize, iconSize]),
    })
      .addTo(map)
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
    updateSelectedResearchers();
  });
};

// Appel de l'initialisation de la carte et des données
initializeData().then(() => {
  addInstitutionMarkers();
  setupFilters();
});

// Initialisation de la div pour le graphique de réseau
const networkChartDiv = L.control({ position: "bottomright" });
networkChartDiv.onAdd = function () {
  const div = L.DomUtil.create("div", "network-chart");
  div.id = "network-chart";
  return div;
};
networkChartDiv.addTo(map);
