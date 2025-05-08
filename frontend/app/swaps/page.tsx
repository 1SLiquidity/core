import SELSection from '../components/home/SELSection';
import Navbar from '../components/navbar';

export default function Home() {
  return (
    <div className="">
      <Navbar />
      <div className="mt-[110px] mb-10 mx-auto w-fit">
        <SELSection />
      </div>
    </div>
  );
}
