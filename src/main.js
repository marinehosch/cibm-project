import L from "leaflet";
import { getInstitutions, getResearchersByInstitution } from "./getDB.js";
import * as d3 from "d3";

// Initialisation de la carte Leaflet
const map = L.map("map").setView([46.51999710099841, 6.569531292590334], 13);
L.tileLayer(
  "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
  {
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenStreetMap</a>',
  }
).addTo(map);

L.svg().addTo(map);

// Définition de l'icône personnalisée
const customIcon = (size) =>
  L.icon({
    iconUrl: "/src/icons/blue-circle.svg",
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1]],
  });

// Fonction pour calculer la taille de l'icône en fonction du nombre de chercheurs
const calculateIconSize = (numResearchers) => {
  const minSize = 15;
  const maxSize = 50;
  const zoom = map.getZoom(); // Récupérer le niveau de zoom actuel de la carte

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

// Fonction pour mettre à jour les chercheurs sélectionnés en fonction des institutions et des filtres de module
const updateSelectedResearchers = () => {
  const selectedModules = Array.from(
    document.querySelectorAll(".module-filter:checked")
  ).map((cb) => cb.value);

  if (selectedInstitutions.length === 0 && selectedModules.length === 0) {
    // Aucune institution sélectionnée et aucun filtre de module, ne rien afficher
    selectedResearchers = [];
  } else if (selectedModules.length === 0) {
    // Aucun filtre de module sélectionné, afficher tous les chercheurs autour des institutions sélectionnées
    selectedResearchers = researchers.filter((researcher) =>
      selectedInstitutions.includes(researcher.institution)
    );
  } else {
    // Filtre de module sélectionné, afficher les chercheurs autour des institutions correspondantes
    selectedResearchers = researchers.filter(
      (researcher) =>
        selectedInstitutions.includes(researcher.institution) &&
        selectedModules.includes(researcher.module)
    );
  }

  // Mettre à jour l'affichage des chercheurs
  displaySelectedResearchers(selectedResearchers);
};

// Fonction pour afficher les chercheurs sélectionnés autour des institutions
const displaySelectedResearchers = (selectedResearchers) => {
  // Supprimer tous les marqueurs et lignes existants
  const overlay = d3.select(map.getPanes().overlayPane).select("svg");
  overlay.selectAll("*").remove();

  selectedResearchers.forEach((researcher, index) => {
    // Calculer la position autour de l'institution (exemple simplifié, à ajuster selon vos besoins)
    const institution = institutions.find(
      (inst) => inst.name === researcher.institution
    );
    if (!institution) return;

    const center = map.latLngToLayerPoint([
      institution.latitude,
      institution.longitude,
    ]);
    const radius = 100;
    const angleStep = (2 * Math.PI) / selectedResearchers.length;

    const x = center.x + radius * Math.cos(index * angleStep);
    const y = center.y + radius * Math.sin(index * angleStep);

    // Ajouter les éléments (cercles, texte) pour chaque chercheur
    overlay
      .append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 7)
      .attr("fill", "#61b2e4")
      .attr("opacity", 0.7)
      .attr("stroke", "grey");

    overlay
      .append("text")
      .attr("x", x + 12)
      .attr("y", y + 2)
      .text(researcher.name)
      .attr("class", "researcher-label");

    // Ajouter une ligne entre le chercheur et l'institution
    overlay
      .append("line")
      .attr("x1", x)
      .attr("y1", y)
      .attr("x2", center.x)
      .attr("y2", center.y)
      .attr("stroke", "black");
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

// Gestion du clic en dehors des institutions pour effacer les chercheurs
map.on("click", clearResearchers);

// Fonction pour ajouter des marqueurs pour chaque institution sur la carte
const addInstitutionMarkers = () => {
  institutions.forEach((institution) => {
    if (!institution.latitude || !institution.longitude) return;

    // Calculer la taille de l'icône en fonction du nombre de chercheurs
    const numResearchers = researchers.filter(
      (r) => r.institution === institution.name
    ).length;
    const iconSize = calculateIconSize(numResearchers);

    const marker = L.marker([institution.latitude, institution.longitude], {
      icon: customIcon([iconSize, iconSize]), // Taille de l'icône basée sur le nombre de chercheurs
    })
      .addTo(map)
      .bindPopup(institution.name);

    marker.on("click", () => {
      // Mettre à jour la liste des institutions sélectionnées
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
      updateSelectedResearchers(); // Mettre à jour les chercheurs sélectionnés
    });
  });

  // Ecouteur de reset pour réinitialiser les filtres de module
  document.getElementById("reset-filters").addEventListener("click", () => {
    document.querySelectorAll(".module-filter").forEach((checkbox) => {
      checkbox.checked = false;
    });
    selectedInstitutions = []; // Réinitialiser les institutions sélectionnées
    updateSelectedResearchers(); // Réinitialiser les chercheurs sélectionnés
  });
};

// Appel de l'initialisation de la carte et des données
initializeData().then(() => {
  addInstitutionMarkers(); // Ajouter les marqueurs d'institution à la carte
  setupFilters(); // Initialiser les filtres de module
});
