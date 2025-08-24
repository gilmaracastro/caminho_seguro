// TROQUE por sua fonte real (API/JSON). Mantive um mock mínimo.
window.acidentes = [
  { lat:-9.370, lng:-40.507, severidade:3, desc:"Colisão frontal" },
  { lat:-9.585, lng:-40.315, severidade:2, desc:"Saída de pista" },
  { lat:-9.791, lng:-40.160, severidade:1, desc:"Batida traseira" }
];

// Se for buscar de API, faça algo como:
// window.acidentes = await (await fetch('/acidentes.json')).json();
