<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
class RuleSeeder extends Seeder {
    public function run(): void {
        $rules = [
            ['key'=>'WAR_CONSECUTIVE_LIMIT','description'=>'Máximo 4 guerras consecutivas antes de rotación','value'=>json_encode(4)],
            ['key'=>'CAPITAL_MIN_ATTACKS','description'=>'Mínimo 5 ataques por finde capital','value'=>json_encode(5)],
            ['key'=>'INACTIVITY_3','description'=>'4d sin actividad -> OBSERVACION','value'=>json_encode(4)],
            ['key'=>'INACTIVITY_6','description'=>'6d sin actividad -> RIESGO','value'=>json_encode(6)],
            ['key'=>'INACTIVITY_9','description'=>'9d sin actividad -> EXPULSABLE','value'=>json_encode(9)],
            ['key'=>'WAR_PREFERENCE_BEHAVIOR','description'=>'OUT depriorizado (MARK)','value'=>json_encode('MARK')],
            ['key'=>'VENCIMIENTO_LEVE','description'=>'30d','value'=>json_encode(30)],
            ['key'=>'VENCIMIENTO_MEDIA','description'=>'60d','value'=>json_encode(60)],
            ['key'=>'VENCIMIENTO_GRAVE','description'=>'90d','value'=>json_encode(90)],
        ];
        foreach ($rules as $r) { DB::table('rules')->updateOrInsert(['key'=>$r['key']], array_merge($r,['created_at'=>now(),'updated_at'=>now()])); }
    }
}
