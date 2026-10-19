// Offline authoring only: never imported by the browser bundle.
// @ts-ignore clipper-lib's upstream JavaScript package has no declaration file.
import Clipper from "clipper-lib";
import type { MultiPolygon, Ring } from "polygon-clipping";
/** Integer millimetres avoid floating sweep failures on almost coincident
 * junctions. Preserve PolyTree holes: no road over islands and no sidewalk over
 * asphalt. See upstream Clipper documentation linked in the master-plan notes. */
export function integerBoolean(subject:MultiPolygon,clip:MultiPolygon=[],difference=false):MultiPolygon {
  const paths=(polygons:MultiPolygon)=>polygons.flatMap(polygon=>polygon.map((ring,i)=>{
    const path=ring.map(p=>({X:Math.round(p[0]*1000),Y:Math.round(p[1]*1000)}));
    if(Clipper.Clipper.Orientation(path)!==(i===0))path.reverse();return path;
  }));
  const engine=new Clipper.Clipper(),tree=new Clipper.PolyTree();
  engine.StrictlySimple=true;
  engine.AddPaths(paths(subject),Clipper.PolyType.ptSubject,true);
  if(clip.length)engine.AddPaths(paths(clip),Clipper.PolyType.ptClip,true);
  if(!engine.Execute(difference?Clipper.ClipType.ctDifference:Clipper.ClipType.ctUnion,tree,Clipper.PolyFillType.pftNonZero,Clipper.PolyFillType.pftNonZero))throw Error("Integer road boolean failed");
  const result:MultiPolygon=[];
  const ring=(node:any):Ring=>{const ps=node.Contour().map((p:any)=>[p.X/1000,p.Y/1000]);if(ps.length)ps.push([...ps[0]]);return ps;};
  const visit=(node:any)=>{
    for(const outer of node.Childs()){
      const contour=ring(outer);if(contour.length>=4)result.push([contour,...outer.Childs().map(ring).filter((r:Ring)=>r.length>=4)]);
      for(const hole of outer.Childs())visit(hole);
    }
  };visit(tree);return result;
}
