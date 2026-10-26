export type CarbonElectricityEstimate = {
  kg: number | null;
  lb: number | null;
  source: 'carbon-interface';
};

export async function estimateElectricityCarbon(kwh: number, country = 'cn'): Promise<CarbonElectricityEstimate | null> {
  const key = process.env.CARBON_INTERFACE_API_KEY;
  if (!key) return null;
  const response = await fetch('https://www.carboninterface.com/api/v1/estimates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      type: 'electricity',
      electricity_unit: 'kwh',
      electricity_value: kwh,
      country,
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return {
    kg: data.data?.attributes?.carbon_kg ?? null,
    lb: data.data?.attributes?.carbon_lb ?? null,
    source: 'carbon-interface',
  };
}
