import GridScan from './GridScan';

type NeonTunnelBackdropProps = {
  className?: string;
};

export default function NeonTunnelBackdrop({ className = '' }: NeonTunnelBackdropProps) {
  return (
    <>
      <div className={`pointer-events-none fixed inset-0 -z-20 opacity-95 ${className}`.trim()}>
        <GridScan
          sensitivity={0.4}
          lineThickness={1.1}
          linesColor="#3558ff"
          gridScale={0.12}
          scanColor="#ff5ce1"
          scanOpacity={0.34}
          enablePost
          bloomIntensity={0.9}
          chromaticAberration={0.0014}
          noiseIntensity={0.004}
          className="h-full w-full"
        />
      </div>

      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(74,110,255,0.14),transparent_24%),linear-gradient(180deg,rgba(3,4,12,0.01)_0%,rgba(3,4,12,0.2)_38%,rgba(3,4,12,0.8)_100%)]" />
    </>
  );
}
