interface SkillLevelBadgeProps {
  score: number;
}

const getLevel = (score: number) => {
  if (score >= 4.2) return { label: "Excellent", color: "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40" };
  if (score >= 3.5) return { label: "Strong", color: "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/40" };
  if (score >= 2.5) return { label: "Developing", color: "text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/40" };
  return { label: "Needs Improvement", color: "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/40" };
};

const SkillLevelBadge = ({ score }: SkillLevelBadgeProps) => {
  const { label, color } = getLevel(score);
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {label}
    </span>
  );
};

export default SkillLevelBadge;
export { getLevel };
