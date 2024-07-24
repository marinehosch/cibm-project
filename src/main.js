import L from "leaflet";
import { getInstitutions, getResearchersByInstitution } from "./getDB.js";
import * as d3 from "d3";

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

const svgLayer = d3.select(map.getPanes().overlayPane).select("svg");

// Définition de l'icône personnalisée
const blueIcon = (size) =>
  L.icon({
    iconUrl: "/src/icons/blue-circle.svg",
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1]],
  });

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

// Palette de couleurs personnalisée pour les modules
const moduleColors = d3
  .scaleOrdinal()
  .domain(["MRI", "EEG", "SP", "DS", "PET"])
  .range(["#304F5A", "#FBB522", "#4592ac", "#00008B", "#000000"]);

// Fonction pour initialiser les données
const initializeData = async () => {
  try {
    researchers = await getResearchersByInstitution();
    institutions = await getInstitutions();
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
    const x = center.x + radius * Math.cos(index * angleStep);
    const y = center.y + radius * Math.sin(index * angleStep);

    // Ajouter les éléments (cercles) pour chaque chercheur
    const circle = svgLayer
      .append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 7)
      .attr("fill", moduleColors(researcher.module))
      .attr("opacity", 0.7)
      .attr("stroke", "grey");

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
      .attr("font-family", "Arial");
    //ajouter un évènement pour afficher le texte au survol - marche pas
    // circle.on("mouseover", () => {
    //   text.attr("visibility", "visible");
    // });
    // circle.on("mouseout", () => {
    //   text.attr("visibility", "hidden");
    // });

    //ajouter une rotation au texte pour qu'il soit lisible
    text.attr(
      "transform",
      `rotate(${(index * 360) / selectedResearchers.length}, ${x}, ${y})`
    );

    //faire disparaitre le texte au zoomout
    if (map.getZoom() < 12) {
      text.attr("visibility", "hidden");
    } else {
      text.attr("visibility", "visible");
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
      .attr(
        "stroke",
        moduleColors(
          selectedResearchers.find((r) => r.x === x1 && r.y === y1).module
        )
      )
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

// Fonction pour effacer les chercheurs si clic sur la carte
const clearResearchers = () => {
  selectedInstitutions = [];
  updateSelectedResearchers();
};

map.on("click", clearResearchers);

// Fonction pour ajouter des marqueurs pour chaque institution sur la carte
const addInstitutionMarkers = () => {
  institutions.forEach((institution) => {
    if (!institution.latitude || !institution.longitude) return;

    const numResearchers = researchers.filter(
      (r) => r.institution === institution.name
    ).length;
    const iconSize = calculateIconSize(numResearchers);

    const marker = L.marker([institution.latitude, institution.longitude], {
      icon: blueIcon([iconSize, iconSize]),
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
