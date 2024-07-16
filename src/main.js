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

// Fonction pour calculer la taille de l'icône en fonction du nombre de chercheurs
const calculateIconSize = (numResearchers) => {
  const minSize = 20;
  const maxSize = 60;
  const size = Math.min(maxSize, minSize + numResearchers * 2);
  return [size, size];
};

// Fonction pour initialiser les données
const initializeData = async () => {
  const researchers = await getResearchersByInstitution();
  const institutions = await getInstitutions();

  const institutionNames = institutions.map((inst) => inst.name);
  const modules = [...new Set(researchers.map((r) => r.module))];

  return { researchers, institutions, institutionNames, modules };
};

initializeData().then(
  ({ researchers, institutions, institutionNames, modules }) => {
    // Création de panes pour institutions et modules
    const createPanes = (institutions, modules) => {
      institutions.forEach((institution) => {
        map.createPane(`institution-${institution.name}`);
      });
      modules.forEach((module) => {
        map.createPane(`module-${module}`);
      });
    };

    createPanes(institutions, modules);

    // Fonction pour ajouter des marqueurs pour chaque institution
    const addMarkers = (institutions, researchers) => {
      const institutionPositions = {};
      institutions.forEach((institution) => {
        institutionPositions[institution.name] = {
          latitude: institution.latitude,
          longitude: institution.longitude,
        };

        if (!institution.latitude || !institution.longitude) {
          console.warn(
            `Skipping institution ${institution.name} due to missing coordinates`
          );
          return; // Ignorer les institutions sans coordonnées
        }

        const iconSize = calculateIconSize(
          researchers.filter((r) => r.institution === institution.name).length
        );

        const customIcon = L.icon({
          iconUrl: "/src/icons/blue-circle.svg",
          iconSize: iconSize,
          iconAnchor: [iconSize[0] / 2, iconSize[1]],
          popupAnchor: [0, -iconSize[1]],
        });

        const marker = L.marker([institution.latitude, institution.longitude], {
          icon: customIcon,
          pane: `institution-${institution.name}`,
        })
          .addTo(map)
          .bindPopup(institution.name)
          .openPopup();

        marker.on("mouseover", () => {
          marker.openPopup();
        });

        marker.on("click", () => {
          const researchersForInstitution = researchers.filter(
            (r) => r.institution === institution.name
          );
          displayRelations(researchersForInstitution);
        });
      });
    };

    // Fonction pour afficher les relations entre les chercheurs
    const displayRelations = (researchers) => {
      const overlay = d3.select(map.getPanes().overlayPane).select("svg");
      const researcherGroup = overlay
        .append("g")
        .attr("class", "leaflet-zoom-hide");

      const institutionPositions = {};
      institutions.forEach((institution) => {
        institutionPositions[institution.name] = map.latLngToLayerPoint([
          institution.latitude,
          institution.longitude,
        ]);
      });

      const links = researcherGroup
        .selectAll("line")
        .data(researchers)
        .enter()
        .append("line")
        .attr("x1", (d) => institutionPositions[d.institution].x)
        .attr("y1", (d) => institutionPositions[d.institution].y)
        .attr(
          "x2",
          (d) =>
            institutionPositions[d.institution].x + Math.random() * 100 - 50
        )
        .attr(
          "y2",
          (d) =>
            institutionPositions[d.institution].y + Math.random() * 100 - 50
        )
        .attr("stroke", "black")
        .attr("stroke-width", 1);

      const nodes = researcherGroup
        .selectAll("circle")
        .data(researchers)
        .enter()
        .append("circle")
        .attr(
          "cx",
          (d) =>
            institutionPositions[d.institution].x + Math.random() * 100 - 50
        )
        .attr(
          "cy",
          (d) =>
            institutionPositions[d.institution].y + Math.random() * 100 - 50
        )
        .attr("r", 5)
        .attr("fill", "#61b2e4")
        .attr("opacity", 0.7)
        .attr("stroke", "grey");

      map.on("zoomend", update);
      map.on("moveend", update);

      function update() {
        if (!researcherGroup) return;

        links
          .attr("x1", (d) => institutionPositions[d.institution].x)
          .attr("y1", (d) => institutionPositions[d.institution].y)
          .attr(
            "x2",
            (d) =>
              institutionPositions[d.institution].x + Math.random() * 100 - 50
          )
          .attr(
            "y2",
            (d) =>
              institutionPositions[d.institution].y + Math.random() * 100 - 50
          );

        nodes
          .attr(
            "cx",
            (d) =>
              institutionPositions[d.institution].x + Math.random() * 100 - 50
          )
          .attr(
            "cy",
            (d) =>
              institutionPositions[d.institution].y + Math.random() * 100 - 50
          );
      }

      update();
    };

    addMarkers(institutions, researchers);

    // Fonction pour filtrer les chercheurs
    const filterResearchers = (moduleFilter) => {
      d3.selectAll("circle").style("display", function (d) {
        return moduleFilter.includes(d.module) ? "block" : "none";
      });
    };

    document.querySelectorAll(".module-filter").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const selectedModules = Array.from(
          document.querySelectorAll(".module-filter:checked")
        ).map((cb) => cb.value);
        filterResearchers(selectedModules);
      });
    });

    document.getElementById("reset-filters").addEventListener("click", () => {
      document.querySelectorAll(".module-filter").forEach((checkbox) => {
        checkbox.checked = false;
      });
      filterResearchers([]);
    });
  }
);
