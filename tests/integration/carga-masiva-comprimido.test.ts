import { describe, expect, it } from "vitest";
import { RECHAZO } from "@/dominio/carga-masiva";
import { leerComprimido } from "@/servicios/carga-masiva/comprimido";
import { armarComprimido, armarTxt, comprimidoConNombreCp850, foto, renglon } from "./ayudantes-carga";

const TXT = armarTxt([renglon("Muñeca")]);

const mensajeDe = (accion: () => unknown) => {
  try {
    accion();
  } catch (error) {
    return (error as Error).message;
  }
  return null;
};

describe("leerComprimido (FR-002, research 2 y 3)", () => {
  it("rechaza un archivo que no es .zip", () => {
    expect(mensajeDe(() => leerComprimido(foto("roja.jpg")))).toBe(RECHAZO.noEsZip);
  });

  it("rechaza un comprimido sin .txt", () => {
    expect(mensajeDe(() => leerComprimido(armarComprimido({ "roja.jpg": foto("roja.jpg") })))).toBe(RECHAZO.sinTxt);
  });

  it("rechaza un comprimido con dos .txt", () => {
    expect(mensajeDe(() => leerComprimido(armarComprimido({ "a.txt": TXT, "b/b.TXT": TXT })))).toBe(RECHAZO.variosTxt);
  });

  it("rechaza un .txt de más de 2 MB", () => {
    const grande = TXT + "x".repeat(2 * 1024 * 1024);
    expect(mensajeDe(() => leerComprimido(armarComprimido({ "productos.txt": grande })))).toBe(RECHAZO.txtGrande);
  });

  it("ignora carpetas y metadatos de macOS", () => {
    const comprimido = leerComprimido(
      armarComprimido({
        "productos.txt": TXT,
        "__MACOSX/._productos.txt": "basura",
        "__MACOSX/fotos/._roja.jpg": "basura",
        "._roja.jpg": "basura",
        "roja.jpg": foto("roja.jpg"),
      }),
    );
    expect(new TextDecoder().decode(comprimido.txt)).toBe(TXT);
    expect(comprimido.fotosNoUsadas(new Set(["roja.jpg"]))).toBe(0);
  });

  it("casos límite «Mayúsculas» y «Fotos en carpetas»: encuentra la foto sin importar carpeta ni mayúsculas", () => {
    const comprimido = leerComprimido(armarComprimido({ "productos.txt": TXT, "fotos/sub/Muñeca.JPG": foto("roja.jpg") }));
    expect(comprimido.foto("muñeca.jpg")).toEqual(foto("roja.jpg"));
    expect(comprimido.foto("MUÑECA.jpg")).toEqual(foto("roja.jpg"));
    expect(comprimido.foto("muneca.jpg")).toBe("noViene");
  });

  it("research 3: lee los nombres en CP850 sin la marca UTF-8 (Explorador de Windows)", () => {
    const comprimido = leerComprimido(comprimidoConNombreCp850("muñeca.jpg", foto("azul.png"), { "productos.txt": TXT }));
    expect(comprimido.foto("muñeca.jpg")).toEqual(foto("azul.png"));
  });

  it("research 3: lee los nombres en NFD (macOS)", () => {
    const comprimido = leerComprimido(
      armarComprimido({ "productos.txt": TXT, ["muñeca.jpg".normalize("NFD")]: foto("roja.jpg") }),
    );
    expect(comprimido.foto("muñeca.jpg")).toEqual(foto("roja.jpg"));
  });

  it("con dos fotos del mismo nombre en carpetas distintas, usa la primera", () => {
    const comprimido = leerComprimido(
      armarComprimido({ "productos.txt": TXT, "a/foto.jpg": foto("roja.jpg"), "b/foto.jpg": foto("azul.png") }),
    );
    expect(comprimido.foto("foto.jpg")).toEqual(foto("roja.jpg"));
  });

  it("caso límite «Fotos de más»: cuenta las que ningún renglón menciona", () => {
    const comprimido = leerComprimido(
      armarComprimido({
        "productos.txt": TXT,
        "roja.jpg": foto("roja.jpg"),
        "azul.png": foto("azul.png"),
        "verde.webp": foto("verde.webp"),
      }),
    );
    expect(comprimido.fotosNoUsadas(new Set(["roja.jpg"]))).toBe(2);
  });

  it("FR-005: una foto que declara más de 10 MB no es válida", () => {
    const comprimido = leerComprimido(
      armarComprimido({ "productos.txt": TXT, "enorme.jpg": new Uint8Array(10 * 1024 * 1024 + 1) }),
    );
    expect(comprimido.foto("enorme.jpg")).toBe("noValida");
  });
});
